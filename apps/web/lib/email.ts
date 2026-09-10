import 'server-only'

import type { HelpRequestInput } from '@sitekhata/shared'

// TODO: switch back to hello@credenceinnovations.co once that domain is
// verified in Resend (resend.com/domains) — until then the sandbox account
// can only deliver to its own address.
const SUPPORT_TO_EMAIL = 'tool.credenceinnovations@gmail.com'

/**
 * One provider, one call — no abstraction layer for a single email type.
 * Uses Resend's HTTP API directly (no SDK) so this stays a single fetch.
 *
 * Sent FROM a verified sender, reply-to the requester's own email, so
 * hitting "reply" in the inbox goes straight back to them.
 */
export async function sendSupportEmail(
  input: HelpRequestInput & { siteName: string; role: string }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const from = process.env.SUPPORT_FROM_EMAIL ?? 'SiteKhata <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: SUPPORT_TO_EMAIL,
      reply_to: input.email,
      subject: `[SiteKhata support] ${input.subject}`,
      text: [
        `From: ${input.name} <${input.email}>`,
        `Site: ${input.siteName}`,
        `Role: ${input.role}`,
        `Category: ${input.category}`,
        '',
        input.message,
      ].join('\n'),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend request failed (${res.status}): ${body}`)
  }
}
