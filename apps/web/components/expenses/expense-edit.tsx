'use client'

import { useExpense } from '@/lib/hooks/use-expenses'
import { ExpenseForm } from './expense-form'

export function ExpenseEdit({ id }: { id: string }) {
  const { data: expense, isLoading } = useExpense(id)

  if (isLoading) return <p className="list-loading">Loading expense…</p>
  if (!expense) return <p className="list-loading">Expense not found.</p>

  return <ExpenseForm expense={expense} />
}
