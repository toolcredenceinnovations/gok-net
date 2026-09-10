import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { can, type Capability } from '@sitekhata/shared'
import { createClient } from '@/lib/supabase/server'
import type { AppSession, Membership } from './types'

export type { AppSession, Membership } from './types'

/**
 * AUTH REMOVED (temporary).
 *
 * The auth service backend is being rebuilt from scratch, so there is no
 * real login anymore: every request is treated as this fixed Owner identity,
 * on whichever site exists in the database (seeded once, see
 * supabase/migrations/20260911000100_dev_identity_seed.sql).
 *
 * Still the one place the app answers "who is this, and what site are they
 * on?" — when real auth comes back, only this function needs to change.
 */
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export const getSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createClient()

  const [{ data: profile }, { data: site }] = await Promise.all([
    supabase.from('user_profiles').select('id, name, phone').eq('id', DEV_USER_ID).single(),
    supabase.from('sites').select('id, name').order('created_at').limit(1).single(),
  ])

  if (!profile || !site) return null

  const membership: Membership = { siteId: site.id, siteName: site.name, role: 'owner' }

  return {
    userId: profile.id,
    name: profile.name,
    email: null,
    phone: profile.phone ?? null,
    siteId: site.id,
    siteName: site.name,
    role: 'owner',
    memberships: [membership],
  }
})

/** Use in any protected page. Sends anonymous users to the login screen. */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Route-level role gate. SCOPE.md Q5: members may read every expense row
 * (that is an RLS policy), but the spend-breakdown dashboard is a route gate.
 * RLS cannot express "this page", so this is where that rule lives.
 *
 * Sends a signed-in user who lacks the capability somewhere they CAN go,
 * rather than showing them a dead end.
 */
export async function requireCapability(capability: Capability): Promise<AppSession> {
  const session = await requireSession()
  if (!can(session.role, capability)) redirect('/expenses')
  return session
}
