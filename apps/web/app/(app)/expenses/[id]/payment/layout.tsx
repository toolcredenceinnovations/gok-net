import { requireCapability } from '@/lib/auth/session'

/** Recording a payment is PIN-gated on the write itself, but Owner/Admin only reach the form at all. */
export default async function RecordPaymentLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('recordPayment')
  return <>{children}</>
}
