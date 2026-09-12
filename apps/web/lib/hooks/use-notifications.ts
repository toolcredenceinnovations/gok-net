'use client'

import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { unwrap } from '@/lib/errors'
import { useSession } from '@/lib/auth/session-context'
import { queryKeys } from './keys'

/**
 * Notifications RLS only ever grants `select`/`update (read_at)` scoped to
 * `user_id = auth.uid()` (see the notifications migration) — rows are
 * written by DB triggers or the cron route, never by the client — so reads
 * and mark-as-read go straight through the browser client, the same way
 * `useAuditLog` in `use-team.ts` does.
 *
 * 30 days is enforced server-side (the cron route purges older rows); the
 * `gte` here just keeps the query itself cheap and matches the retention
 * window in the UI.
 */

export type NotificationType = 'expense_created' | 'payment_recorded' | 'payment_due'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  entity: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

const RETENTION_DAYS = 30

export function useNotifications() {
  const session = useSession()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = queryKeys.notifications.list(session.userId)

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<AppNotification[]> => {
      const since = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString()
      return unwrap(
        await supabase
          .from('notifications')
          .select('id, type, title, body, entity, entity_id, read_at, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
      ) as unknown as AppNotification[]
    },
    refetchInterval: 60_000,
  })

  // Live badge updates. Falls back to the 60s poll above if the socket
  // never connects (flaky site signal is the norm here, per SCOPE.md).
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${session.userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.userId}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId])

  const unreadCount = useMemo(() => (query.data ?? []).filter((n) => !n.read_at).length, [query.data])

  return { ...query, unreadCount }
}

export function useMarkNotificationRead() {
  const session = useSession()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(session.userId) }),
  })
}

export function useMarkAllNotificationsRead() {
  const session = useSession()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', session.userId)
        .is('read_at', null)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(session.userId) }),
  })
}
