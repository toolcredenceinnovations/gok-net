import * as Sentry from '@sentry/nextjs'

/**
 * Browser error tracking. Next 16 loads this before the app hydrates.
 *
 * Replays are deliberately NOT enabled here — PostHog already does session
 * replay (see providers.tsx), and two replay recorders is duplicated cost
 * and duplicated PII exposure for no extra insight.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  tracesSampleRate: 1,
  sendDefaultPii: false,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
})

/** Lets Sentry tie an error to the navigation that was in flight. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
