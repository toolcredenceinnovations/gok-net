'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role, TeamInviteInput, TeamMemberCreateInput } from '@gok-net/shared'
import { createClient } from '@/lib/supabase/client'
import { unwrap } from '@/lib/errors'
import { queryKeys } from './keys'

/**
 * Site roster and the audit log.
 *
 * Both are gated by RLS to owner/admin ("owner admin read site roster",
 * "owner admin read site audit log"), so a member calling these gets an
 * empty array rather than an error. The route gate keeps them off the page
 * in the first place.
 */

export interface TeamMember {
  userId: string
  name: string
  phone: string | null
  role: Role
  active: boolean
  joinedAt: string
}

export interface TeamInvitation {
  id: string
  phone: string
  role: Exclude<Role, 'owner'>
  status: 'pending'
  expires_at: string
  created_at: string
}

export interface TeamRoster {
  members: TeamMember[]
  invitations: TeamInvitation[]
  invitationsAvailable: boolean
}

async function teamRequest(method: string, body?: unknown) {
  const response = await fetch('/api/team', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error ?? 'Could not update the team.')
  return payload.data
}

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.team,
    queryFn: async (): Promise<TeamRoster> => teamRequest('GET'),
  })
}

/** Owner only — "owner updates memberships". */
export function useChangeRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) =>
      teamRequest('PATCH', { userId, role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  })
}

/** Owner only — "owner removes memberships". Cannot remove yourself (RLS enforces this too). */
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => teamRequest('DELETE', { userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  })
}

/**
 * Adds an existing user immediately, or creates a pending phone invitation
 * that is claimed automatically after the recipient's first OTP sign-in.
 */
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TeamInviteInput | TeamMemberCreateInput) => {
      return teamRequest('POST', input) as Promise<
        | { kind: 'member'; name: string; role: Role }
        | { kind: 'invitation'; invitation: TeamInvitation }
      >
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  })
}

export function useRenewInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => teamRequest('PUT', { invitationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => teamRequest('DELETE', { invitationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  })
}

export interface AuditEntry {
  id: number
  action: string
  entity: string
  entity_id: string | null
  before_json: unknown
  after_json: unknown
  created_at: string
  actor: { name: string } | null
}

export function useAuditLog(filters: { actorId?: string | null; action?: string | null } = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.audit(filters),
    queryFn: async (): Promise<AuditEntry[]> => {
      let query = supabase
        .from('audit_log')
        .select(
          'id, action, entity, entity_id, before_json, after_json, created_at, actor:user_profiles(name)'
        )
        .order('created_at', { ascending: false })
        .limit(200)

      if (filters.actorId) query = query.eq('actor_id', filters.actorId)
      if (filters.action) query = query.eq('action', filters.action)

      return unwrap(await query) as unknown as AuditEntry[]
    },
  })
}
