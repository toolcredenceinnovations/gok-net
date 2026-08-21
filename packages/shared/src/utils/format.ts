/**
 * Money formatting. Indian grouping throughout — ₹2,50,000, not ₹250,000.
 * Never format money inline; always come through here so web and mobile agree.
 */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const INR_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ₹2,50,000 — the default for display. */
export function formatAmount(amount: number, showPaise = false): string {
  if (!Number.isFinite(amount)) return '₹0'
  return showPaise ? INR_PAISE.format(amount) : INR.format(amount)
}

/**
 * The helper line under the amount input: "2.5 lakh".
 * Design principle 6 — no jargon, and a site engineer thinks in lakh, not
 * in digit groups. Anything under ₹1,000 just shows the amount.
 */
export function formatLakh(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return ''
  const abs = Math.abs(amount)
  if (abs >= 10000000) return `${trimZero(amount / 10000000)} crore`
  if (abs >= 100000) return `${trimZero(amount / 100000)} lakh`
  if (abs >= 1000) return `${trimZero(amount / 1000)}K`
  return formatAmount(amount)
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

/** Parse what a user typed — "2,50,000" or "₹2.5L" — into a number. */
export function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/[₹,\s]/g, '').toLowerCase()
  if (!cleaned) return null

  const lakh = cleaned.match(/^([\d.]+)\s*(l|lakh|lac)$/)
  if (lakh?.[1]) return Math.round(Number(lakh[1]) * 100000)

  const crore = cleaned.match(/^([\d.]+)\s*(cr|crore)$/)
  if (crore?.[1]) return Math.round(Number(crore[1]) * 10000000)

  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** DD/MM/YYYY — the format the client reads dates in. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
