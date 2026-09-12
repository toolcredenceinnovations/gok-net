'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, Check, IndianRupee, Paperclip, ShieldCheck, X } from 'lucide-react'
import { paymentSchema, PAYMENT_MODES, CHEQUE_STATUSES, type PaymentInput } from '@gok-net/shared'
import { AmountDisplay } from '@/components/shared/amount-display'
import { PinDialog } from '@/components/shared/pin-dialog'
import { useExpense } from '@/lib/hooks/use-expenses'
import { useInvalidateAfterPinAction } from '@/lib/hooks/use-payments'
import { useUploadAttachment } from '@/lib/hooks/use-attachments'
import { useSession } from '@/lib/auth/session-context'
import { useTeam } from '@/lib/hooks/use-team'
import { track } from '@/lib/analytics'

const MODE_LABEL: Record<(typeof PAYMENT_MODES)[number], string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  voucher: 'Voucher',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RecordPaymentForm({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const session = useSession()
  const { data: expense, isLoading } = useExpense(expenseId)
  const invalidateAfterPin = useInvalidateAfterPinAction()
  const uploadAttachment = useUploadAttachment()
  const { data: team } = useTeam()
  const members = team?.members ?? []

  const [pinOpen, setPinOpen] = useState(false)
  const [payload, setPayload] = useState<PaymentInput | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      expense_id: expenseId,
      amount: undefined,
      mode: 'cash',
      paid_by: session.userId,
      paid_on: today(),
      remark: '',
      cheque_no: '',
      cheque_bank: '',
      cheque_status: null,
    },
  })

  const mode = watch('mode')
  const amount = watch('amount')

  // Pre-fill the amount to the full outstanding balance once the expense loads.
  useEffect(() => {
    if (expense && amount === undefined) {
      setValue('amount', expense.outstanding > 0 ? expense.outstanding : expense.amount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense])

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

  const backHref = `/expenses/${expenseId}`

  const onSubmit = handleSubmit((input) => {
    if (input.amount > expense.outstanding) {
      toast.error('Payment cannot be more than the outstanding balance.')
      return
    }
    setPayload(input)
    setPinOpen(true)
  })

  async function handlePinSuccess(result: unknown) {
    invalidateAfterPin(expenseId)
    track.paymentRecorded({ mode: payload!.mode, is_partial: (payload!.amount ?? 0) < expense!.outstanding })

    const created = result as { id: string } | undefined
    if (receipt && created?.id) {
      try {
        await uploadAttachment.mutateAsync({ file: receipt, type: 'invoice', paymentId: created.id })
      } catch {
        toast.error('Payment recorded, but the receipt could not be uploaded.')
      }
    }

    setSaved(true)
    toast.success('Payment recorded')
    router.push(backHref)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <Link className="icon-button" href={backHref} aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="eyebrow">{expense.description}</p>
          <h1>Record a payment</h1>
          <p>Apply a payment against {expense.vendors?.name ?? 'this expense'}.</p>
        </div>
        <Link className="icon-button close-button" href={backHref} aria-label="Close">
          <X size={21} />
        </Link>
      </div>

      <form className="crud-workspace" onSubmit={onSubmit}>
        <section className="form-card payment-context">
          <div>
            <span>Expense total</span>
            <AmountDisplay amount={expense.amount} size="md" />
          </div>
          <div>
            <span>Already paid</span>
            <AmountDisplay amount={expense.total_paid} size="md" />
          </div>
          <div>
            <span>Outstanding</span>
            <AmountDisplay amount={expense.outstanding} size="lg" />
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>Payment details</h2>
              <p>Record the amount and how it was paid.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field amount-field">
              <span>Amount paid</span>
              <div className="input-with-icon">
                <IndianRupee size={21} />
                <input inputMode="decimal" {...register('amount', { valueAsNumber: true })} />
              </div>
              {errors.amount ? (
                <small className="field-error">{errors.amount.message}</small>
              ) : (
                <small>Maximum outstanding: ₹{expense.outstanding.toLocaleString('en-IN')}</small>
              )}
            </label>
            <label className="field">
              <span>Payment date</span>
              <div className="input-with-icon">
                <Calendar size={17} />
                <input type="date" {...register('paid_on')} />
              </div>
              {errors.paid_on && <small className="field-error">{errors.paid_on.message}</small>}
            </label>
            <div className="field field-wide">
              <span>Payment mode</span>
              <div className="payment-mode-grid">
                {PAYMENT_MODES.map((item) => (
                  <button
                    type="button"
                    className={mode === item ? 'is-active' : ''}
                    onClick={() => setValue('mode', item)}
                    key={item}
                  >
                    {mode === item && <Check size={14} />} {MODE_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'cheque' && (
              <>
                <label className="field">
                  <span>Cheque number</span>
                  <input placeholder="e.g. 004821" {...register('cheque_no')} />
                  {errors.cheque_no && <small className="field-error">{errors.cheque_no.message}</small>}
                </label>
                <label className="field">
                  <span>
                    Bank <em>Optional</em>
                  </span>
                  <input placeholder="e.g. HDFC Bank" {...register('cheque_bank')} />
                </label>
                <label className="field">
                  <span>Cheque status</span>
                  <select {...register('cheque_status', { setValueAs: (v) => v || null })}>
                    <option value="">Select status</option>
                    {CHEQUE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status[0].toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.cheque_status && <small className="field-error">{errors.cheque_status.message}</small>}
                </label>
              </>
            )}
            <label className="field">
              <span>Paid by</span>
              <select {...register('paid_by')}>
                {members.filter((member) => member.active).map((member) => (
                  <option key={member.userId} value={member.userId}>{member.name}</option>
                ))}
                {!members.some((member) => member.userId === session.userId) && (
                  <option value={session.userId}>{session.name}</option>
                )}
              </select>
              {errors.paid_by && <small className="field-error">{errors.paid_by.message}</small>}
            </label>
            <label className="field field-wide">
              <span>
                Remark <em>Optional</em>
              </span>
              <input placeholder="Add a note about this payment" {...register('remark')} />
            </label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>Proof of payment</h2>
              <p>Add an invoice, receipt or cheque image. Optional.</p>
            </div>
          </div>
          <label className="upload-area">
            <Paperclip size={20} />
            <span>
              <strong>{receipt ? receipt.name : 'Choose a receipt from your device'}</strong>
              <small>PDF, JPG or PNG · Up to 10 MB</small>
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (file && file.size > 10 * 1024 * 1024) {
                  toast.error('Receipt must be 10 MB or smaller.')
                  event.target.value = ''
                  setReceipt(null)
                  return
                }
                setReceipt(file)
              }}
            />
          </label>
        </section>

        <div className="crud-footer">
          <p>{hasErrors ? 'Check the highlighted fields.' : 'This action will update the expense balance.'}</p>
          <div>
            <Link className="secondary-button" href={backHref}>
              Cancel
            </Link>
            <button className="primary-button" type="submit" disabled={saved}>
              {saved ? <Check size={17} /> : <ShieldCheck size={17} />} {saved ? 'Payment recorded' : 'Verify PIN & record'}
            </button>
          </div>
        </div>
      </form>

      {payload && (
        <PinDialog
          action="record_payment"
          payload={payload}
          open={pinOpen}
          onOpenChange={setPinOpen}
          onSuccess={handlePinSuccess}
        />
      )}
    </div>
  )
}
