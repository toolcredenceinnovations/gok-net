import { RecordPaymentForm } from '@/components/payments/record-payment-form'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecordPaymentForm expenseId={id} />
}
