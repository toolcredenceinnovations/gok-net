import { createClient } from '@/lib/supabase/server'
import { AmountDisplay } from '@/components/shared/amount-display'

/**
 * Phase 0 placeholder. Proves the full path works end to end: session →
 * RLS-scoped query → typed result → shared formatter. The real month
 * dashboard (charts, tabs, month picker) lands in Phase 3.
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: summary } = await supabase
    .from('v_monthly_category_summary')
    .select('category_name, total_amount, outstanding_amount')
    .order('total_amount', { ascending: false })

  const totalSpent = (summary ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const outstanding = (summary ?? []).reduce((s, r) => s + Number(r.outstanding_amount ?? 0), 0)

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">This month</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Total spent</p>
          <AmountDisplay amount={totalSpent} size="xl" showHelper className="mt-1 block" />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Not paid yet</p>
          <AmountDisplay amount={outstanding} size="xl" showHelper className="mt-1 block" />
        </div>
      </div>

      {(summary ?? []).length === 0 && (
        <p className="mt-8 text-neutral-600">
          Nothing logged yet. Add your first expense to see it here.
        </p>
      )}
    </main>
  )
}
