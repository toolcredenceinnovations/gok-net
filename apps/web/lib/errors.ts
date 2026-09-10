'use client'

import { toast } from 'sonner'
import * as Sentry from '@sentry/nextjs'

/**
 * CONVENTIONS.md: wrap every Supabase call, show a toast on failure, never
 * let an error fail silently.
 *
 * The user gets plain language ("Could not save. Try again."); Sentry gets
 * the real error. Design principle 6 — no jargon, and a Postgres error code
 * is the definition of jargon.
 */
export function reportError(error: unknown, userMessage: string): void {
  toast.error(userMessage)
  Sentry.captureException(error, { extra: { userMessage } })
  // Next's development overlay treats console.error as an uncaught app error.
  // This path has already handled the failure with a toast and Sentry, so keep
  // the useful local diagnostic without covering the UI with a false crash.
  if (process.env.NODE_ENV === 'development') console.warn(userMessage, error)
}

/**
 * Throws on a Supabase error so TanStack Query moves into its error state.
 *
 * Takes the whole `{ data, error }` response (not `data`/`error` destructured
 * into separate generic slots) so the inferred type is `NonNullable<R['data']>`
 * — an indexed access distributed over the response's success/error union —
 * rather than asking TS to infer a bare `T` from a `T | null` position across
 * that same union, which it collapses to `null`.
 */
export function unwrap<R extends { data: unknown; error: unknown }>(
  response: R
): NonNullable<R['data']> {
  if (response.error) throw response.error
  return response.data as NonNullable<R['data']>
}

/**
 * Turns the handful of Postgres failures a user can actually cause into
 * something readable. Anything else stays generic — a raw driver message
 * helps nobody standing on a site in the sun.
 */
export function friendlyMessage(error: unknown, fallback = 'Could not save. Try again.'): string {
  const code = (error as { code?: string } | null)?.code
  switch (code) {
    case '23505':
      return 'That already exists.'
    case '23503':
      return 'Something this refers to is missing. Refresh and try again.'
    case '23514':
      return 'Some of those details are not valid together. Check the form.'
    case '42501':
      return 'You do not have permission to do that.'
    case '42703':
      return 'The database needs to be updated before this can be saved.'
    default:
      return fallback
  }
}
