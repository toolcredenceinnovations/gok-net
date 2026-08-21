'use client'

import posthog from 'posthog-js'

/**
 * Exactly eight events, per OPERATOR.md. Resist adding a ninth — more events
 * means more noise, and at 4–6 users the signal is thin to begin with.
 */
export const track = {
  expenseCreated: (p: { category: string; has_vendor: boolean; status: 'paid' | 'unpaid' }) =>
    posthog.capture('expense_created', p),

  paymentRecorded: (p: { mode: 'cash' | 'cheque' | 'voucher'; is_partial: boolean }) =>
    posthog.capture('payment_recorded', p),

  entryVoided: (p: { reason_given: boolean }) => posthog.capture('entry_voided', p),

  pinUsed: (p: { action: 'mark_paid' | 'void' }) => posthog.capture('pin_used', p),

  attachmentUploaded: (p: { type: 'invoice' | 'challan'; source: 'camera' | 'file' }) =>
    posthog.capture('attachment_uploaded', p),

  exportTriggered: (p: { period: 'month' | 'custom' }) => posthog.capture('export_triggered', p),

  vendorSearched: (p: { has_results: boolean }) => posthog.capture('vendor_searched', p),

  login: (p: { role: string }) => posthog.capture('login', p),
}

/** Ties session replays to a person, so support means watching, not guessing. */
export function identify(user: { id: string; name: string; role: string; site_id: string }) {
  posthog.identify(user.id, { name: user.name, role: user.role, site_id: user.site_id })
}
