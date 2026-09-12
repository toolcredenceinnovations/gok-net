import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pinSetSchema } from '@gok-net/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

/**
 * Set or change the site's action PIN. Separate from /api/pin/verify, which
 * is specifically "verify the PIN and perform a money action" — this route
 * only ever touches `sites.settings.pin_hash`, never expenses/payments.
 *
 * First-time setup (no pin_hash yet) needs no current PIN — the owner
 * already proved who they are via session + role. Changing an existing PIN
 * requires re-entering it, same as any other security-sensitive settings
 * action: the session alone should not be enough to silently rewrite it.
 */

/**
 * Whether a PIN exists, never the hash itself. The Settings UI used to infer
 * this from audit_log ('pin_set'/'pin_changed' rows), which is wrong: a PIN
 * set outside that flow — the seed script, a support fix — leaves no such
 * row, so the UI showed "No PIN set yet" for a site that had one, and then
 * asked to save a "first-time" PIN with no current-PIN field even though the
 * server correctly required one. `sites.settings.pin_hash` is the only
 * source of truth for whether a PIN exists.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can manage the action PIN' }, { status: 403 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('pin/get is not configured', error)
    return NextResponse.json(
      { error: 'The PIN service is not configured. Ask an administrator to add the server key.' },
      { status: 503 }
    )
  }

  const { data: site, error: siteError } = await admin
    .from('sites')
    .select('settings')
    .eq('id', session.siteId)
    .single()
  if (siteError) {
    return NextResponse.json({ error: 'Could not load the site settings. Try again.' }, { status: 503 })
  }

  const hasPin = Boolean((site?.settings as { pin_hash?: string } | null)?.pin_hash)
  return NextResponse.json({ data: { hasPin } })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can manage the action PIN' }, { status: 403 })
  }

  const parsed = pinSetSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the PIN' },
      { status: 400 }
    )
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('pin/set is not configured', error)
    return NextResponse.json(
      { error: 'The PIN service is not configured. Ask an administrator to add the server key.' },
      { status: 503 }
    )
  }

  const { data: site, error: siteError } = await admin
    .from('sites')
    .select('settings')
    .eq('id', session.siteId)
    .single()
  if (siteError) {
    return NextResponse.json({ error: 'Could not load the site settings. Try again.' }, { status: 503 })
  }

  const settings = (site?.settings as { pin_hash?: string } | null) ?? {}
  const existingHash = settings.pin_hash

  if (existingHash) {
    if (!parsed.data.currentPin) {
      return NextResponse.json({ error: 'Enter the current PIN to change it' }, { status: 400 })
    }
    if (!(await bcrypt.compare(parsed.data.currentPin, existingHash))) {
      await admin.from('audit_log').insert({
        site_id: session.siteId,
        actor_id: session.userId,
        action: 'pin_failed',
        entity: 'sites',
        entity_id: session.siteId,
      })
      return NextResponse.json({ error: 'That current PIN is not right' }, { status: 403 })
    }
  }

  const newHash = await bcrypt.hash(parsed.data.newPin, 10)
  const { error: updateError } = await admin
    .from('sites')
    .update({ settings: { ...settings, pin_hash: newHash } })
    .eq('id', session.siteId)
  if (updateError) {
    return NextResponse.json({ error: 'Could not save the new PIN. Try again.' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    site_id: session.siteId,
    actor_id: session.userId,
    action: existingHash ? 'pin_changed' : 'pin_set',
    entity: 'sites',
    entity_id: session.siteId,
  })

  return NextResponse.json({ data: { ok: true } })
}
