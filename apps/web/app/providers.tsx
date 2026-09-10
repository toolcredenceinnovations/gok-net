'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  )

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: true,
      // Session replay from day one — when someone says "the app is
      // confusing", watch the recording instead of guessing.
      // Inputs ARE masked: this app's inputs are money, vendor names and the
      // action PIN. A replay must never carry the PIN.
      session_recording: { maskAllInputs: true },
      loaded: (ph) => {
        if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') ph.opt_out_capturing()
      },
    })
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* CONVENTIONS.md: never let a failed write fail silently. */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </QueryClientProvider>
    </PostHogProvider>
  )
}
