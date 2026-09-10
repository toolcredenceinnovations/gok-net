import * as Sentry from '@sentry/nextjs'

/**
 * Server-side error tracking. OPERATOR.md: alert threshold is 1 occurrence —
 * at 4–6 users, one error is already worth knowing about.
 *
 * No DSN configured (e.g. local dev) means Sentry initialises inert rather
 * than throwing, so this is safe to import unconditionally.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  // Low volume app; full traces are affordable and far more useful.
  tracesSampleRate: 1,
  // Money amounts, vendor names and PINs must not leave the building.
  sendDefaultPii: false,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
})
