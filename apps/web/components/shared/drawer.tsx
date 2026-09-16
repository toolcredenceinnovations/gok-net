'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Side panel variant of <Modal> — same backdrop/close semantics, but slides
 * in from the right instead of centering. For content better browsed
 * alongside the page than interrupting it (previews, detail panels).
 *
 * Backdrop click and Escape both close; the panel itself does not, via
 * stopPropagation.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className = 'max-w-md',
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
      className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`flex h-full w-full flex-col bg-white shadow-xl animate-in slide-in-from-right duration-200 ${className}`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-5">
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="icon-button shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
