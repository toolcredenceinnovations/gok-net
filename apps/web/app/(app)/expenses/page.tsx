import { ExpensesList } from '@/components/expenses/expenses-list'

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return <ExpensesList initialQuery={q ?? ''} />
}
