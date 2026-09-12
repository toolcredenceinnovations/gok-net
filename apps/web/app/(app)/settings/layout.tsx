import { requireCapability } from '@/lib/auth/session'

/** Site profile, PIN and site management are Owner only (AUTH.md, DECISIONS.md). */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('manageSites')
  return <>{children}</>
}
