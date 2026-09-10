import { ExpenseForm } from '@/components/expenses/expense-form'

export default async function Page({ searchParams }: { searchParams: Promise<{ vendorId?: string }> }) {
  const { vendorId } = await searchParams
  return <ExpenseForm defaultVendorId={vendorId} />
}
