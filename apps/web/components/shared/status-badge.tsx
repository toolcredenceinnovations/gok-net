import { STATUS_LABEL, type ExpenseStatus } from '@sitekhata/shared'
import { cn } from '@/lib/utils'

/**
 * Design principle 5: colour carries status, but never colour alone — the
 * text label ships with it, so this still reads for a colour-blind user and
 * in a black-and-white export.
 */
const STYLES: Record<ExpenseStatus, string> = {
  unpaid: 'bg-red-100 text-red-800 ring-red-600/20',
  partial: 'bg-amber-100 text-amber-900 ring-amber-600/20',
  paid: 'bg-green-100 text-green-800 ring-green-600/20',
}

export function StatusBadge({
  status,
  className,
}: {
  status: ExpenseStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
