import { NextResponse } from 'next/server'
import {
  teamInvitationActionSchema,
  teamMemberCreateSchema,
  teamInviteSchema,
  teamMemberRemoveSchema,
  teamRoleChangeSchema,
} from '@gok-net/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

const digits = (value: string) => value.replace(/\D/g, '')

async function ownerContext() {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  if (session.role !== 'owner') {
    return {
      error: NextResponse.json({ error: 'Only an owner can manage the team' }, { status: 403 }),
    }
  }
  // The team API deliberately centralises privileged writes. Its service-role
  // client never leaves the server, and every operation is scoped to siteId.
  return { session, db: createAdminClient() as any }
}

export async function GET() {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context

  const { error: expiryError } = await db
    .from('team_invitations')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('site_id', session.siteId)
    .eq('status', 'pending')
    .lte('expires_at', new Date().toISOString())

  const [{ data: memberships, error: memberError }, { data: invitations, error: inviteError }] =
    await Promise.all([
      db
        .from('user_sites')
        .select('user_id, role, created_at, user_profiles(id, name, phone, active)')
        .eq('site_id', session.siteId),
      db
        .from('team_invitations')
        .select('id, phone, role, status, expires_at, created_at')
        .eq('site_id', session.siteId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
  if (memberError) return NextResponse.json({ error: 'Could not load the team' }, { status: 500 })

  const invitationsAvailable = !expiryError && !inviteError

  return NextResponse.json({
    data: {
      members: (memberships ?? []).map((row: any) => ({
        userId: row.user_id,
        name: row.user_profiles?.name ?? 'Unknown member',
        phone: row.user_profiles?.phone ?? null,
        role: row.role,
        active: row.user_profiles?.active ?? false,
        joinedAt: row.created_at,
      })),
      invitations: invitationsAvailable ? (invitations ?? []) : [],
      invitationsAvailable,
    },
  })
}

export async function POST(request: Request) {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context
  const body = await request.json().catch(() => null)
  const credentials = teamMemberCreateSchema.safeParse(body)
  if (credentials.success) {
    const { data: user, error: authError } = await db.auth.admin.createUser({
      email: credentials.data.email,
      password: credentials.data.password,
      email_confirm: true,
      user_metadata: { name: credentials.data.name },
    })
    if (authError || !user.user)
      return NextResponse.json({ error: authError?.message ?? 'Could not create the account' }, { status: 400 })

    const { error: membershipError } = await db.from('user_sites').insert({
      user_id: user.user.id,
      site_id: session.siteId,
      role: credentials.data.role,
    })
    if (membershipError) {
      await db.auth.admin.deleteUser(user.user.id)
      return NextResponse.json({ error: 'Could not add the new account to this site' }, { status: 500 })
    }
    await db.from('user_profiles').update({ active_site_id: session.siteId }).eq('id', user.user.id)
    await db.from('audit_log').insert({
      site_id: session.siteId,
      actor_id: session.userId,
      action: 'member_added',
      entity: 'user_sites',
      entity_id: user.user.id,
      after_json: { email: credentials.data.email, role: credentials.data.role },
    })
    return NextResponse.json({ data: { kind: 'member', name: credentials.data.name, role: credentials.data.role } })
  }

  const parsed = teamInviteSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the details' },
      { status: 400 }
    )

  const phone = digits(parsed.data.phone)
  const { data: profiles, error: profileError } = await db
    .from('user_profiles')
    .select('id, name, phone')
    .not('phone', 'is', null)
  if (profileError)
    return NextResponse.json({ error: 'Could not check that phone number' }, { status: 500 })
  const profile = profiles?.find((item: any) => digits(item.phone ?? '') === phone)

  if (profile) {
    const { data: existing } = await db
      .from('user_sites')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('site_id', session.siteId)
      .maybeSingle()
    if (existing)
      return NextResponse.json(
        { error: `${profile.name} is already on this site.` },
        { status: 409 }
      )
    const { error } = await db
      .from('user_sites')
      .insert({ user_id: profile.id, site_id: session.siteId, role: parsed.data.role })
    if (error) return NextResponse.json({ error: 'Could not add that member' }, { status: 500 })
    await db.from('audit_log').insert({
      site_id: session.siteId,
      actor_id: session.userId,
      action: 'member_added',
      entity: 'user_sites',
      entity_id: profile.id,
      after_json: { role: parsed.data.role },
    })
    return NextResponse.json({
      data: { kind: 'member', name: profile.name, role: parsed.data.role },
    })
  }

  const { data: existingInvite } = await db
    .from('team_invitations')
    .select('id')
    .eq('site_id', session.siteId)
    .eq('phone', phone)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingInvite)
    return NextResponse.json(
      { error: 'An invitation is already pending for this phone number.' },
      { status: 409 }
    )
  const { data: invitation, error } = await db
    .from('team_invitations')
    .insert({ site_id: session.siteId, phone, role: parsed.data.role, invited_by: session.userId })
    .select('id, phone, role, status, expires_at, created_at')
    .single()
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === 'PGRST205' || error.code === '42P01'
            ? 'This person has not signed in yet, and pending invitations are not enabled on this database. Apply the team invitations migration first.'
            : 'Could not create the invitation',
      },
      { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 }
    )
  await db.from('audit_log').insert({
    site_id: session.siteId,
    actor_id: session.userId,
    action: 'member_invited',
    entity: 'team_invitations',
    entity_id: invitation.id,
    after_json: { phone, role: parsed.data.role },
  })
  return NextResponse.json({ data: { kind: 'invitation', invitation } })
}

export async function PATCH(request: Request) {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context
  const parsed = teamRoleChangeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the role' },
      { status: 400 }
    )
  if (parsed.data.userId === session.userId)
    return NextResponse.json(
      { error: 'Transfer ownership from another owner account; you cannot change your own role.' },
      { status: 400 }
    )

  const { data: before } = await db
    .from('user_sites')
    .select('role')
    .eq('site_id', session.siteId)
    .eq('user_id', parsed.data.userId)
    .maybeSingle()
  if (!before) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  const { error } = await db
    .from('user_sites')
    .update({ role: parsed.data.role })
    .eq('site_id', session.siteId)
    .eq('user_id', parsed.data.userId)
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('always have') ? error.message : 'Could not update the role',
      },
      { status: 400 }
    )
  await db.from('audit_log').insert({
    site_id: session.siteId,
    actor_id: session.userId,
    action: 'member_role_changed',
    entity: 'user_sites',
    entity_id: parsed.data.userId,
    before_json: before,
    after_json: { role: parsed.data.role },
  })
  return NextResponse.json({ data: { userId: parsed.data.userId, role: parsed.data.role } })
}

export async function DELETE(request: Request) {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context
  const body = await request.json().catch(() => null)
  const invitation = teamInvitationActionSchema.safeParse(body)
  if (invitation.success) {
    const { data, error } = await db
      .from('team_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', invitation.data.invitationId)
      .eq('site_id', session.siteId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    await db.from('audit_log').insert({
      site_id: session.siteId,
      actor_id: session.userId,
      action: 'invitation_revoked',
      entity: 'team_invitations',
      entity_id: data.id,
    })
    return NextResponse.json({ data })
  }
  const member = teamMemberRemoveSchema.safeParse(body)
  if (!member.success)
    return NextResponse.json({ error: 'Choose a member to remove' }, { status: 400 })
  if (member.data.userId === session.userId)
    return NextResponse.json(
      { error: 'You cannot remove yourself from the active site.' },
      { status: 400 }
    )
  const { data, error } = await db
    .from('user_sites')
    .delete()
    .eq('site_id', session.siteId)
    .eq('user_id', member.data.userId)
    .select('user_id')
    .maybeSingle()
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('always have')
          ? error.message
          : 'Could not remove that member',
      },
      { status: 400 }
    )
  if (!data) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  await db.from('audit_log').insert({
    site_id: session.siteId,
    actor_id: session.userId,
    action: 'member_removed',
    entity: 'user_sites',
    entity_id: member.data.userId,
  })
  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context
  const parsed = teamInvitationActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invitation not found' }, { status: 400 })
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 86400000).toISOString()
  const { data, error } = await db
    .from('team_invitations')
    .update({ expires_at: expiresAt, updated_at: now.toISOString() })
    .eq('id', parsed.data.invitationId)
    .eq('site_id', session.siteId)
    .eq('status', 'pending')
    .select('id, phone, role, status, expires_at, created_at')
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  await db.from('audit_log').insert({
    site_id: session.siteId,
    actor_id: session.userId,
    action: 'invitation_renewed',
    entity: 'team_invitations',
    entity_id: data.id,
    after_json: { expires_at: expiresAt },
  })
  return NextResponse.json({ data })
}
