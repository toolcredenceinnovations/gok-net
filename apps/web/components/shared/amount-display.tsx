import { formatAmount, formatLakh } from '@sitekhata/shared'
import { cn } from '@/lib/utils'

/**
 * Design principle 4: money is big. Everything else is secondary.
 * Always render money through this — never format inline.
 */
export function AmountDisplay({
  amount,
  size = 'md',
  showHelper = false,
  className,
}: {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Shows the "2.5 lakh" reading underneath. */
  showHelper?: boolean
  className?: string
}) {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base font-semibold',
    lg: 'text-2xl font-semibold tracking-tight',
    xl: 'text-4xl font-bold tracking-tight',
  } as const

  const helper = showHelper ? formatLakh(amount) : ''

  return (
    <span className={cn('tabular-nums', className)}>
      <span className={sizes[size]}>{formatAmount(amount)}</span>
      {helper && <span className="ml-2 text-sm font-normal text-neutral-500">{helper}</span>}
    </span>
  )
}
