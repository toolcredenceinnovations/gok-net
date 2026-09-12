import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { can, type Capability, type Role } from '@gok-net/shared'
import { createClient } from '@/lib/supabase/server'
import type { AppSession, Membership } from './types'

export type { AppSession, Membership } from './types'

export const getSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, phone, active_site_id')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  const { data: memberships } = await supabase
    .from('user_sites')
    .select('site_id, role, sites(id, name)')
    .eq('user_id', user.id)
  if (!memberships?.length) return null

  const current =
    memberships.find((membership) => membership.site_id === profile.active_site_id) ?? memberships[0]
  const site = Array.isArray(current.sites) ? current.sites[0] : current.sites
  if (!site) return null

  const currentRole = current.role as Role
  const membership: Membership = { siteId: site.id, siteName: site.name, role: currentRole }

  return {
    userId: profile.id,
    name: profile.name,
    email: user.email ?? null,
    phone: profile.phone ?? null,
    siteId: site.id,
    siteName: site.name,
    role: currentRole,
    memberships: memberships.flatMap((item) => {
      const itemSite = Array.isArray(item.sites) ? item.sites[0] : item.sites
      return itemSite
        ? [{ siteId: itemSite.id, siteName: itemSite.name, role: item.role as Role }]
        : []
    }),
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
