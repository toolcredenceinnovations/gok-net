import type { Role } from '@sitekhata/shared'

/**
 * Session shape, in its own module so client components can import the type
 * without pulling in `session.ts`, which is `server-only`.
 */

export interface Membership {
  siteId: string
  siteName: string
  role: Role
}

export interface AppSession {
  userId: string
  name: string
  email: string | null
  phone: string | null
  siteId: string
  siteName: string
  role: Role
  /** Every site this user belongs to — drives the site switcher. */
  memberships: Membership[]
}
