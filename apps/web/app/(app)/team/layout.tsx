import { requireCapability } from '@/lib/auth/session'

/** User management is Owner only (AUTH.md). */
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('manageUsers')
  return <>{children}</>
}
