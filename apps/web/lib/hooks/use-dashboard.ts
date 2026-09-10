'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { unwrap } from '@/lib/errors'
import { queryKeys } from './keys'

/**
 * Dashboard aggregates. These read `v_monthly_category_summary`, which sums
 * in Postgres rather than shipping every row to the browser to reduce it
 * there — the difference matters once a site has a few thousand entries.
 *
 * The view already excludes voided entries.
 */

export interface CategorySummary {
  category_id: string
  category_name: string
  entry_count: number
  total_amount: number
  paid_amount: number
  outstanding_amount: number
}

export interface MonthSummary {
  totalSpent: number
  totalPaid: number
  totalOutstanding: number
  entryCount: number
  byCategory: CategorySummary[]
}

/** `month` is 'YYYY-MM'. */
export function useMonthSummary(month: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.dashboard.month(month),
    queryFn: async (): Promise<MonthSummary> => {
      const rows = unwrap(
        await supabase
          .from('v_monthly_category_summary')
          .select(
            'category_id, category_name, entry_count, total_amount, paid_amount, outstanding_amount'
          )
          .eq('month', `${month}-01`)
      ) as CategorySummary[]

      return {
        totalSpent: sum(rows, 'total_amount'),
        totalPaid: sum(rows, 'paid_amount'),
        totalOutstanding: sum(rows, 'outstanding_amount'),
        entryCount: sum(rows, 'entry_count'),
        byCategory: [...rows].sort((a, b) => b.total_amount - a.total_amount),
      }
    },
  })
}

export interface TrendPoint {
  month: string
  total: number
  paid: number
  outstanding: number
}

/** The 12-month spend bar chart. Returns oldest → newest, gaps filled with 0. */
export function useSpendTrend(months = 12) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.dashboard.trend(months),
    queryFn: async (): Promise<TrendPoint[]> => {
      const start = new Date()
      start.setUTCDate(1)
      start.setUTCMonth(start.getUTCMonth() - (months - 1))
      const from = start.toISOString().slice(0, 10)

      const rows = unwrap(
        await supabase
          .from('v_monthly_category_summary')
          .select('month, total_amount, paid_amount, outstanding_amount')
          .gte('month', from)
          .order('month')
      ) as Array<{
        month: string
        total_amount: number
        paid_amount: number
        outstanding_amount: number
      }>

      // The view is one row per category per month; fold to one per month.
      const byMonth = new Map<string, TrendPoint>()
      for (let i = 0; i < months; i++) {
        const d = new Date(start)
        d.setUTCMonth(start.getUTCMonth() + i)
        const key = d.toISOString().slice(0, 7)
        byMonth.set(key, { month: key, total: 0, paid: 0, outstanding: 0 })
      }
      for (const row of rows) {
        const key = row.month.slice(0, 7)
        const point = byMonth.get(key)
        if (!point) continue
        point.total += Number(row.total_amount)
        point.paid += Number(row.paid_amount)
        point.outstanding += Number(row.outstanding_amount)
      }

      return [...byMonth.values()]
    },
  })
}

function sum<T>(rows: readonly T[], key: keyof T): number {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
}
