'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  HELP_REQUEST_CATEGORIES,
  HELP_REQUEST_CATEGORY_LABEL,
  helpRequestSchema,
  type HelpRequestInput,
} from '@gok-net/shared'
import { useSession } from '@/lib/auth/session-context'
import { reportError } from '@/lib/errors'

/**
 * Sends the query straight to hello@credenceinnovations.co (see
 * lib/email.ts) — nothing is stored in the app, so there is no support-ticket
 * table or inbox to maintain here.
 */
export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const session = useSession()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HelpRequestInput>({
    resolver: zodResolver(helpRequestSchema),
    defaultValues: { name: session.name, email: '', category: 'question', subject: '', message: '' },
  })

  // Fresh form (prefilled name, everything else blank) each time it's opened.
  useEffect(() => {
    if (open) reset({ name: session.name, email: '', category: 'question', subject: '', message: '' })
  }, [open, session.name, reset])

  const onSubmit = handleSubmit(async (input) => {
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body = await res.json()

      if (!res.ok) {
        reportError(new Error(body.error ?? 'send failed'), body.error ?? 'Could not send your message. Try again.')
        return
      }

      toast.success('Message sent — we usually reply within a day.')
      onOpenChange(false)
    } catch (error) {
      reportError(error, 'Could not reach the server. Check your signal and try again.')
    }
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => onOpenChange(false)}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Help &amp; support</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Tell us what's going on — this goes straight to our support inbox.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-sm font-medium">Your name</span>
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              {...register('name')}
            />
            {errors.name && <small className="text-xs text-red-700">{errors.name.message}</small>}
          </label>

          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-sm font-medium">Your email</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              {...register('email')}
            />
            {errors.email && <small className="text-xs text-red-700">{errors.email.message}</small>}
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium">What's this about?</span>
            <select className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" {...register('category')}>
              {HELP_REQUEST_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {HELP_REQUEST_CATEGORY_LABEL[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium">Subject</span>
            <input
              placeholder="Short summary"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              {...register('subject')}
            />
            {errors.subject && <small className="text-xs text-red-700">{errors.subject.message}</small>}
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-sm font-medium">Message</span>
            <textarea
              rows={4}
              placeholder="What happened, and what did you expect instead?"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              {...register('message')}
            />
            {errors.message && <small className="text-xs text-red-700">{errors.message.message}</small>}
          </label>
        </div>

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
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {isSubmitting ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  )
}
