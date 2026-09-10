'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { PinDialog, type PinAction } from './pin-dialog'

/**
 * Reason-then-PIN flow shared by "void an expense" and "void a payment".
 * `voidSchema` (packages/shared) requires a reason of at least 3 characters
 * before the PIN route will accept the write, so this collects it first and
 * only then hands off to <PinDialog>, which is still the single place the
 * PIN itself is ever entered.
 */
export function VoidDialog({
  action,
  payload,
  triggerLabel = 'Void',
  triggerClassName = 'secondary-button danger-text',
  title,
  description,
  onSuccess,
}: {
  action: PinAction
  payload: Record<string, unknown>
  triggerLabel?: React.ReactNode
  triggerClassName?: string
  title: string
  description: string
  onSuccess?: (result: unknown) => void
}) {
  const [step, setStep] = useState<'closed' | 'reason' | 'pin'>('closed')
  const [reason, setReason] = useState('')

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setStep('reason')}>
        {triggerLabel}
      </button>

      {step === 'reason' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setStep('closed')}
        >
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-700" />
              <div>
                <strong className="text-sm font-semibold text-neutral-900">{title}</strong>
                <p className="mt-1 text-sm text-neutral-600">{description}</p>
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold text-neutral-600">
              Reason
              <textarea
                autoFocus
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why is this being voided?"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button type="button" className="secondary-button flex-1" onClick={() => setStep('closed')}>
                Cancel
              </button>
              <button
                type="button"
                className="danger-button flex-1"
                disabled={reason.trim().length < 3}
                onClick={() => setStep('pin')}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <PinDialog
        action={action}
        payload={{ ...payload, reason: reason.trim() }}
        open={step === 'pin'}
        onOpenChange={(open) => setStep(open ? 'pin' : 'closed')}
        onSuccess={(result) => {
          setStep('closed')
          setReason('')
          onSuccess?.(result)
        }}
      />
    </>
  )
}
