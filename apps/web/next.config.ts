import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // packages/shared ships as TypeScript source, not a build step.
  transpilePackages: ['@gok-net/shared'],
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps are uploaded in CI only, where SENTRY_AUTH_TOKEN exists.
  silent: !process.env.CI,
  // Routes browser telemetry around ad blockers, which otherwise eat a
  // meaningful share of client-side errors.
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
})
