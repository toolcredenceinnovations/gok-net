'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExpenseInput, ExpenseStatus } from '@gok-net/shared'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/auth/session-context'
import { unwrap } from '@/lib/errors'
import { track } from '@/lib/analytics'
import { queryKeys, type ExpenseFilters } from './keys'

/**
 * Reads come from `v_expense_totals`, which resolves total_paid / outstanding
 * per row and already excludes voided entries. Writes go to the `expenses`
 * table. Never write to the view.
 *
 * Voiding is NOT here — it goes through PinDialog → /api/pin/verify, because
 * the void columns are not in `authenticated`'s column grants. There is no
 * mutation you could write here that would work.
 */

export interface ExpenseRow {
  id: string
  date: string
  description: string
  amount: number
  status: ExpenseStatus
  category_id: string
  subcategory_id: string | null
  vendor_id: string | null
  challan_no: string | null
  due_date: string | null
  created_by: string
  created_at: string
  total_paid: number
  outstanding: number
  payment_count: number
  last_paid_on: string | null
  categories: { name: string } | null
  subcategories: { name: string } | null
  vendors: { id: string; name: string } | null
  user_profiles: { name: string } | null
}

const SELECT = `
  id, date, description, amount, status, category_id, subcategory_id, vendor_id,
  challan_no, due_date, created_by, created_at,
  total_paid, outstanding, payment_count, last_paid_on,
  categories(name),
  subcategories(name),
  vendors(id, name),
  user_profiles!expenses_created_by_fkey(name)
`

/** Inclusive first day / exclusive first day of the next month, for '2026-08'. */
function monthBounds(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to = new Date(Date.UTC(year, mon, 1))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async (): Promise<ExpenseRow[]> => {
      let query = supabase
        .from('v_expense_totals')
        .select(SELECT)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (filters.month) {
        const { from, to } = monthBounds(filters.month)
        query = query.gte('date', from).lt('date', to)
      }
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
      if (filters.search?.trim()) {
        query = query.ilike('description', `%${filters.search.trim()}%`)
      }

      return unwrap(await query) as unknown as ExpenseRow[]
    },
  })
}

export function useExpense(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: async (): Promise<ExpenseRow> =>
      unwrap(
        await supabase.from('v_expense_totals').select(SELECT).eq('id', id).single()
      ) as unknown as ExpenseRow,
    enabled: Boolean(id),
  })
}

/**
 * A voided entry is invisible in `v_expense_totals` by design, so the detail
 * page falls back to the base table to render it under the void filter and
 * to let the Owner restore it.
 */
export function useExpenseIncludingVoided(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...queryKeys.expenses.detail(id), 'any'],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('expenses')
          .select(
            `id, date, description, amount, status, category_id, subcategory_id,
             vendor_id, challan_no, due_date, created_by, created_at,
             voided_at, voided_by, void_reason,
             categories(name), subcategories(name), vendors(id, name),
             user_profiles!expenses_created_by_fkey(name)`
          )
          .eq('id', id)
          .single()
      ),
    enabled: Boolean(id),
  })
}

export function useCreateExpense() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { siteId, userId } = useSession()

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const row = unwrap(
        await supabase
          .from('expenses')
          .insert({
            site_id: siteId,
            created_by: userId,
            date: input.date,
            description: input.description,
            amount: input.amount,
            category_id: input.category_id,
            subcategory_id: input.subcategory_id ?? null,
            vendor_id: input.vendor_id ?? null,
            challan_no: input.challan_no || null,
            due_date: input.due_date || null,
          })
          .select('id, category_id, vendor_id, status')
          .single()
      )
      return row
    },
    onSuccess: (row, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.totals })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      track.expenseCreated({
        category: input.category_id,
        has_vendor: Boolean(input.vendor_id),
        // A brand new expense always starts unpaid; a payment is a separate,
        // PIN-gated step.
        status: 'unpaid',
      })
    },
  })
}

/**
 * Owner/admin only, enforced by the "owner admin edit expenses" policy.
 * The column grant excludes status and the void columns, so this can only
 * ever touch the editable fields.
 */
export function useUpdateExpense() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }): Promise<{ id: string }> =>
      unwrap(
        await supabase
          .from('expenses')
          .update({
            date: input.date,
            description: input.description,
            amount: input.amount,
            category_id: input.category_id,
            subcategory_id: input.subcategory_id ?? null,
            vendor_id: input.vendor_id ?? null,
            challan_no: input.challan_no || null,
            due_date: input.due_date || null,
          })
          .eq('id', id)
          .select('id')
          .single()
      ),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(row.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.totals })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
