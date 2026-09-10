import { requireCapability } from '@/lib/auth/session'

/**
 * The dashboard role gate.
 *
 * SCOPE.md Q5 and the AUTH.md role table: members may read every expense row
 * on their site — that is an RLS policy, and it stays — but the full
 * spend-breakdown dashboard belongs to Owner, Admin and Viewer (Partner/CA).
 *
 * RLS cannot express "this page", so the rule lives here. A member who lands
 * on /dashboard is sent to /expenses, which is the screen they actually need.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('viewDashboard')
  return <>{children}</>
}
