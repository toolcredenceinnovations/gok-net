import { NextResponse } from 'next/server'
import { siteCreateSchema } from '@gok-net/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

/**
 * Site creation/listing. `sites` grants no `insert` to `authenticated` (only
 * `update (name, address)` — see 20260821080200_rls_policies.sql), so a brand
 * new site can only ever be created through this service-role route, same
 * reasoning as why payments/voids go through /api/pin/verify.
 *
 * Gate is "the caller is an owner somewhere", not "owner of this site" —
 * there is no "this site" yet. Any owner can spin up another Gokulesh Group
 * site and becomes its owner too.
 */
async function ownerContext() {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  if (session.role !== 'owner') {
    return {
      error: NextResponse.json({ error: 'Only an owner can manage sites' }, { status: 403 }),
    }
  }
  return { session, db: createAdminClient() as any }
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'site'}-${suffix}`
}

export async function GET() {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context

  const { data, error } = await db
    .from('user_sites')
    .select('role, sites(id, name, address, slug, archived_at, created_at)')
    .eq('user_id', session.userId)
    .eq('role', 'owner')

  if (error) return NextResponse.json({ error: 'Could not load your sites' }, { status: 500 })

  const sites = (data ?? [])
    .map((row: any) => row.sites)
    .filter(Boolean)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

  return NextResponse.json({ data: sites })
}

export async function POST(request: Request) {
  const context = await ownerContext()
  if ('error' in context) return context.error
  const { session, db } = context

  const parsed = siteCreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the site details' },
      { status: 400 }
    )
  }

  const { data: site, error: siteError } = await db
    .from('sites')
    .insert({
      name: parsed.data.name,
      address: parsed.data.address || null,
      slug: slugify(parsed.data.name),
    })
    .select('id, name, address, slug, archived_at, created_at')
    .single()

  if (siteError || !site)
    return NextResponse.json({ error: 'Could not create the site' }, { status: 500 })

  const { error: membershipError } = await db
    .from('user_sites')
    .insert({ user_id: session.userId, site_id: site.id, role: 'owner' })

  if (membershipError) {
    await db.from('sites').delete().eq('id', site.id)
    return NextResponse.json({ error: 'Could not set you up as the owner of that site' }, { status: 500 })
  }

  await db.from('user_profiles').update({ active_site_id: site.id }).eq('id', session.userId)
  await db.from('audit_log').insert({
    site_id: site.id,
    actor_id: session.userId,
    action: 'site_created',
    entity: 'sites',
    entity_id: site.id,
    after_json: { name: site.name },
  })

  return NextResponse.json({ data: site })
}
