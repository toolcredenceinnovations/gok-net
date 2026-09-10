'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { unwrap } from '@/lib/errors'
import { queryKeys } from './keys'

/**
 * Payments are READ-ONLY over the API. `payments` grants no insert to
 * `authenticated` and has no insert policy — recording or voiding a payment
 * happens inside /api/pin/verify with the service role, after the PIN checks
 * out. See DECISIONS.md, "The PIN gate performs the write".
 *
 * So there is no useCreatePayment here on purpose. Use <PinDialog>.
 * `usePaymentGatedAction` below is the only write path, and it goes through
 * that route.
 */

export interface PaymentRow {
  id: string
  expense_id: string
  amount: number
  mode: 'cash' | 'cheque' | 'voucher'
  paid_on: string
  remark: string | null
  cheque_no: string | null
  cheque_bank: string | null
  cheque_status: 'issued' | 'cleared' | 'bounced' | null
  created_at: string
  voided_at: string | null
  void_reason: string | null
  paid_by_profile: { id: string; name: string } | null
}

const SELECT = `
  id, expense_id, amount, mode, paid_on, remark,
  cheque_no, cheque_bank, cheque_status, created_at, voided_at, void_reason,
  paid_by_profile:user_profiles!payments_paid_by_fkey(id, name)
`

/** Payment history on the expense detail page. Voided ones stay visible. */
export function usePayments(expenseId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.payments.forExpense(expenseId),
    queryFn: async (): Promise<PaymentRow[]> =>
      unwrap(
        await supabase
          .from('payments')
          .select(SELECT)
          .eq('expense_id', expenseId)
          .order('paid_on', { ascending: false })
      ) as unknown as PaymentRow[],
    enabled: Boolean(expenseId),
  })
}

/** The payments screen: everything recorded on the site, newest first. */
export function useRecentPayments(limit = 100) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.payments.recent,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('payments')
          .select(`${SELECT}, expenses(id, description, amount, vendors(name))`)
          .is('voided_at', null)
          .order('paid_on', { ascending: false })
          .limit(limit)
      ),
  })
}

export type PinAction = 'record_payment' | 'void_expense' | 'void_payment'

/**
 * Invalidates everything a PIN-gated write can affect. Call this from the
 * PinDialog's onSuccess so the screen reflects the new state — the status
 * column is recomputed by a database trigger, so the cached row is stale the
 * moment the write lands.
 */
export function useInvalidateAfterPinAction() {
  const queryClient = useQueryClient()

  return (expenseId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.vendors.totals })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['audit'] })
    if (expenseId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId) })
    }
  }
}

/**
 * Programmatic access to the PIN route for flows that collect the PIN
 * themselves is deliberately NOT provided — PinDialog is the single entry
 * point (CONVENTIONS.md). This mutation exists only so PinDialog itself has
 * a typed, cache-aware call.
 */
export function usePinAction() {
  const invalidate = useInvalidateAfterPinAction()

  return useMutation({
    mutationFn: async ({
      action,
      pin,
      payload,
    }: {
      action: PinAction
      pin: string
      payload: Record<string, unknown>
    }) => {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pin, payload }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'That did not work. Try again.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      invalidate(variables.payload?.expense_id as string | undefined)
    },
  })
}
