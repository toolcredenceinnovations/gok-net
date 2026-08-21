import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Phase 3.5 builds the three real tabs (data quality, usage health,
 * integrity). This stub proves the operator gate and the service-role client
 * work. Keep it functional — this is for 7am, not a product screen.
 */
export default async function OperatorDashboard() {
  const admin = createAdminClient()

  const [{ count: sites }, { count: expenses }, { count: users }] = await Promise.all([
    admin.from('sites').select('*', { count: 'exact', head: true }),
    admin.from('expenses').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <main className="min-h-dvh bg-neutral-950 p-8 font-mono text-neutral-100">
      <h1 className="text-lg">operator</h1>
      <table className="mt-6 text-sm">
        <tbody>
          {[
            ['sites', sites],
            ['expenses', expenses],
            ['users', users],
          ].map(([label, value]) => (
            <tr key={String(label)}>
              <td className="pr-8 text-neutral-500">{label}</td>
              <td>{value ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-8 text-xs text-neutral-600">
        Data quality / usage health / integrity tabs land in Phase 3.5.
      </p>
    </main>
  )
}
