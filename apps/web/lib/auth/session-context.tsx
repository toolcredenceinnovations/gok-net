'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { can, type Capability } from '@sitekhata/shared'
import type { AppSession } from './types'

/**
 * The server resolves the session once per request; this carries it to client
 * components so a form can know the role without another round trip.
 *
 * `useCan` hides actions the user cannot perform. It is a courtesy, not a
 * guard — every one of these is also enforced by RLS or by the PIN route.
 */

const SessionContext = createContext<AppSession | null>(null)

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession
  children: ReactNode
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): AppSession {
  const session = useContext(SessionContext)
  if (!session) {
    throw new Error('useSession must be used inside the (app) layout')
  }
  return session
}

/** `const mayVoid = useCan('voidEntry')` */
export function useCan(capability: Capability): boolean {
  const session = useContext(SessionContext)
  return can(session?.role, capability)
}
