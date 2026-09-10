import { requireCapability } from '@/lib/auth/session'

/** Editing an existing expense is owner/admin only (AUTH.md). */
export default async function EditExpenseLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('editExpense')
  return <>{children}</>
}
