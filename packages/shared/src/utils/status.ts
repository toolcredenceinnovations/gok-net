/**
 * Payment status derivation.
 *
 * This MIRRORS the `recompute_expense_status` trigger in
 * supabase/migrations/20260821080100_functions_triggers.sql. The database is
 * the source of truth; this exists so the UI can update optimistically
 * without a round trip. If you change the rule in one place, change it in
 * both — the regression test in supabase/tests/rls_regression.sql covers the
 * database side.
 */

export type ExpenseStatus = 'unpaid' | 'partial' | 'paid'

export interface PaymentLike {
  amount: number
  voided_at?: string | null
}

/** Voided payments never count toward the total. */
export function totalPaid(payments: readonly PaymentLike[]): number {
  return payments.reduce((sum, p) => (p.voided_at ? sum : sum + Number(p.amount)), 0)
}

export function deriveStatus(expenseAmount: number, payments: readonly PaymentLike[]): ExpenseStatus {
  const paid = totalPaid(payments)
  if (paid <= 0) return 'unpaid'
  if (paid >= expenseAmount) return 'paid'
  return 'partial'
}

export function outstanding(expenseAmount: number, payments: readonly PaymentLike[]): number {
  return Math.max(0, expenseAmount - totalPaid(payments))
}

/**
 * Labels and intent for <StatusBadge>. Design principle 5: colour carries
 * status, but never colour alone — every badge also carries this text.
 * Design principle 6: "Not paid yet", not "outstanding liability".
 */
export const STATUS_LABEL: Record<ExpenseStatus, string> = {
  unpaid: 'Not paid yet',
  partial: 'Partly paid',
  paid: 'Paid',
}

export const STATUS_INTENT: Record<ExpenseStatus, 'danger' | 'warning' | 'success'> = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
}
