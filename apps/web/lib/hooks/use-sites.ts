'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SiteCreateInput } from '@gok-net/shared'
import { queryKeys } from './keys'

/**
 * Sites the caller owns. `sites` has no insert grant for `authenticated`
 * (see 20260821080200_rls_policies.sql), so creation is service-role only —
 * this hook talks to /api/sites, not the browser Supabase client directly.
 */

export interface SiteSummary {
  id: string
  name: string
  address: string | null
  slug: string
  archived_at: string | null
  created_at: string
}

async function sitesRequest(method: string, body?: unknown) {
  const response = await fetch('/api/sites', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error ?? 'Could not update sites.')
  return payload.data
}

export function useSites() {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: async (): Promise<SiteSummary[]> => sitesRequest('GET'),
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SiteCreateInput): Promise<SiteSummary> => sitesRequest('POST', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sites }),
  })
}
