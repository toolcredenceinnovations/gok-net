'use client'

import { useEffect } from 'react'

/**
 * The one place the overlay/backdrop/card markup lives. Every dialog in the
 * app (PinDialog, HelpDialog, VoidDialog's reason step) was hand-rolling the
 * same `fixed inset-0 … bg-black/40` backdrop plus a `stopPropagation` card —
 * new dialogs should build on this instead of copying that markup again.
 *
 * Backdrop click and Escape both close; the card itself does not, via
 * stopPropagation.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = 'max-w-sm',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`w-full rounded-2xl bg-white p-6 shadow-xl ${className}`}
      >
        {(title || description) && (
          <div className="mb-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
