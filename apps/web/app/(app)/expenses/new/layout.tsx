import { requireCapability } from '@/lib/auth/session'

/** Owner, admin and member can add an expense (AUTH.md). */
export default async function NewExpenseLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('createExpense')
  return <>{children}</>
}
