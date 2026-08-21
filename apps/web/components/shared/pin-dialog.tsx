'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

export type PinAction = 'record_payment' | 'void_expense' | 'void_payment'

/**
 * The single entry point for every PIN-gated action. Never build another
 * PIN flow — this one is the only path that reaches the server route which
 * verifies the PIN *and performs the write*.
 *
 * Note what does NOT happen here: the PIN is never compared client-side, and
 * no "approval token" is handed back for the client to spend. The write
 * happens inside the server route or it does not happen at all.
 */
export function PinDialog({
  action,
  payload,
  open,
  onOpenChange,
  onSuccess,
}: {
  action: PinAction
  payload: Record<string, unknown>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (result: unknown) => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pin, payload }),
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? 'That did not work. Try again.')
        return
      }

      track.pinUsed({ action: action === 'record_payment' ? 'mark_paid' : 'void' })
      setPin('')
      onOpenChange(false)
      onSuccess?.(body.data)
    } catch {
      setError('Could not reach the server. Check your signal and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => onOpenChange(false)}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Enter the action PIN</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {action === 'record_payment'
            ? 'This records a payment against the entry.'
            : 'This voids the entry. It stays in the record with your reason.'}
        </p>

        <input
          autoFocus
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-3 text-center text-2xl tracking-[0.5em] tabular-nums"
          placeholder="······"
          aria-label="6-digit action PIN"
        />

        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pin.length !== 6 || busy}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  )
}
