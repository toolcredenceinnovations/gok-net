import { STATUS_LABEL, type ExpenseStatus } from '@gok-net/shared'
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

/**
 * Same pill treatment as {@link StatusBadge}, for plain active/inactive
 * state. The inactive label defaults to "Inactive" but takes an override
 * (e.g. "Archived") for callers where that's the more accurate word for the
 * same grey/off state.
 */
export function ActivePill({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  className,
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        active ? 'bg-green-100 text-green-800 ring-green-600/20' : 'bg-gray-100 text-gray-600 ring-gray-500/20',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-green-600' : 'bg-gray-400')} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
