'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Check, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { formatDate } from '@gok-net/shared'
import { AmountDisplay } from '@/components/shared/amount-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { VoidDialog } from '@/components/shared/void-dialog'
import { Drawer } from '@/components/shared/drawer'
import { useExpense } from '@/lib/hooks/use-expenses'
import { usePayments, useInvalidateAfterPinAction } from '@/lib/hooks/use-payments'
import { useCan } from '@/lib/auth/session-context'
import { useAttachments, useSignedUrl } from '@/lib/hooks/use-attachments'
import type { PaymentRow } from '@/lib/hooks/use-payments'

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PaymentReceipt({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false)
  const { data: attachments = [] } = useAttachments({ paymentId })
  const receipt = attachments[0]
  const { data: signedUrl } = useSignedUrl(receipt?.file_path ?? null)

  if (!receipt || !signedUrl) return null

  const isImage = receipt.mime_type?.startsWith('image/')
  const isPdf = receipt.mime_type === 'application/pdf'

  return (
    <>
      <button type="button" className="back-link" onClick={() => setOpen(true)}>
        <ExternalLink size={13} /> Receipt
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Receipt" className="max-w-xl">
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg bg-neutral-100">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signedUrl} alt="Payment receipt" className="max-h-full max-w-full object-contain" />
            ) : isPdf ? (
              <iframe src={signedUrl} title="Payment receipt" className="h-full min-h-[70vh] w-full" />
            ) : (
              <div className="p-8 text-center text-sm text-neutral-600">
                <FileText size={28} className="mx-auto mb-2" />
                Preview isn&apos;t available for this file type.
              </div>
            )}
          </div>
          <a href={signedUrl} target="_blank" rel="noreferrer" className="secondary-button self-start">
            <ExternalLink size={14} /> Open in new tab
          </a>
        </div>
      </Drawer>
    </>
  )
}

function PaymentHistoryRow({ payment, canVoid, expenseId, onChanged }: {
  payment: PaymentRow
  canVoid: boolean
  expenseId: string
  onChanged: () => void
}) {
  return (
    <div className={payment.voided_at ? 'is-voided' : ''}>
      <i><Check size={14} /></i>
      <span>
        <strong>{payment.voided_at ? 'Payment voided' : 'Payment recorded'}</strong>
        <small>{formatDate(payment.paid_on)} · {payment.mode} · {payment.paid_by_profile?.name ?? '—'}</small>
        {payment.mode === 'cheque' && (
          <small>Cheque {payment.cheque_no}{payment.cheque_bank ? ` · ${payment.cheque_bank}` : ''} · {payment.cheque_status}</small>
        )}
        {payment.remark && <small>{payment.remark}</small>}
        {payment.voided_at && payment.void_reason && <small>Reason: {payment.void_reason}</small>}
        {!payment.voided_at && <PaymentReceipt paymentId={payment.id} />}
      </span>
      <span className="flex items-center gap-2">
        <AmountDisplay amount={payment.amount} size="md" />
        {canVoid && !payment.voided_at && (
          <VoidDialog
            action="void_payment"
            payload={{ payment_id: payment.id, expense_id: expenseId }}
            triggerLabel={<Trash2 size={14} />}
            triggerClassName="icon-button"
            title="Void this payment?"
            description="The expense balance will be recalculated. A reason and your action PIN are required."
            onSuccess={onChanged}
          />
        )}
      </span>
    </div>
  )
}

export function ExpenseDetail({ id }: { id: string }) {
  const router = useRouter()
  const { data: expense, isLoading } = useExpense(id)
  const { data: payments = [] } = usePayments(id)
  const canEdit = useCan('editExpense')
  const canRecordPayment = useCan('recordPayment')
  const canVoid = useCan('voidEntry')
  const invalidateAfterPin = useInvalidateAfterPinAction()

  if (isLoading) return <p className="list-loading">Loading expense…</p>
  if (!expense) {
    return (
      <div className="product-page detail-page">
        <Link className="back-link" href="/expenses">
          <ArrowLeft size={15} /> All expenses
        </Link>
        <p className="list-loading">Expense not found.</p>
      </div>
    )
  }

  const progress = expense.amount > 0 ? Math.min(100, Math.round((expense.total_paid / expense.amount) * 100)) : 0

  return (
    <div className="product-page detail-page">
      <Link className="back-link" href="/expenses">
        <ArrowLeft size={15} /> All expenses
      </Link>
      <header className="product-header">
        <div>
          <p className="eyebrow">{expense.vendors?.name ?? 'No vendor'}</p>
          <h1>{expense.description}</h1>
          <p>Recorded by {expense.user_profiles?.name ?? '—'} · {formatDate(expense.date)}</p>
        </div>
        <div className="heading-actions">
          {canEdit && (
            <Link className="secondary-button" href={`/expenses/${id}/edit`}>
              Edit expense
            </Link>
          )}
          {canRecordPayment && expense.status !== 'paid' && (
            <Link className="primary-button" href={`/expenses/${id}/payment`}>
              Record payment
            </Link>
          )}
          {canVoid && (
            <VoidDialog
              action="void_expense"
              payload={{ expense_id: id }}
              triggerLabel={<><Trash2 size={16} /> Void</>}
              title="Void this expense?"
              description="It will leave totals but remain in the audit log. A reason and your action PIN are required."
              onSuccess={() => {
                invalidateAfterPin(id)
                toast.success('Expense voided')
                router.push('/expenses')
              }}
            />
          )}
        </div>
      </header>

      <section className="detail-grid">
        <div className="detail-main">
          <article className="panel detail-hero">
            <StatusBadge status={expense.status} className="detail-hero-status" />
            <p>Total amount</p>
            <AmountDisplay amount={expense.amount} size="xl" showHelper />
            <div className="payment-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="detail-money-grid">
              <span>
                <small>Paid</small>
                <AmountDisplay amount={expense.total_paid} size="md" />
              </span>
              <span>
                <small>Outstanding</small>
                <AmountDisplay amount={expense.outstanding} size="md" />
              </span>
            </div>
          </article>

          <article className="panel detail-section">
            <div className="panel-heading">
              <div>
                <h2>Payment history</h2>
                <p>All money recorded against this expense</p>
              </div>
            </div>
            {payments.length ? (
              <div className="timeline">
                {payments.map((payment) => (
                  <PaymentHistoryRow
                    key={payment.id}
                    payment={payment}
                    canVoid={canVoid}
                    expenseId={id}
                    onChanged={() => {
                      invalidateAfterPin(id)
                      toast.success('Payment voided')
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>
                  <FileText size={22} />
                </span>
                <h3>No payment recorded</h3>
                <p>This expense is currently fully outstanding.</p>
              </div>
            )}
          </article>
        </div>

        <aside className="detail-aside">
          <article className="panel info-card">
            <h2>Expense details</h2>
            <Info label="Date" value={formatDate(expense.date)} />
            <Info label="Category" value={expense.categories?.name ?? '—'} />
            <Info label="Subcategory" value={expense.subcategories?.name ?? '—'} />
            <Info label="Vendor" value={expense.vendors?.name ?? '—'} />
            <Info label="Recorded by" value={expense.user_profiles?.name ?? '—'} />
            {expense.challan_no && <Info label="Challan no." value={expense.challan_no} />}
            {expense.due_date && <Info label="Due date" value={formatDate(expense.due_date)} />}
          </article>
        </aside>
      </section>
    </div>
  )
}
