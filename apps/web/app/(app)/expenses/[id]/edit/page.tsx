import { ExpenseEdit } from '@/components/expenses/expense-edit'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExpenseEdit id={id} />
}
