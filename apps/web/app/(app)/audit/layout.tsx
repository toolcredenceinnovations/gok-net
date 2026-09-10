import { requireCapability } from '@/lib/auth/session'

/** Audit log is Owner + Admin only (AUTH.md). RLS enforces the rows; this
 *  keeps a member off the page rather than showing them an empty table. */
export default async function AuditLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('viewAuditLog')
  return <>{children}</>
}
