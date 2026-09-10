'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@sitekhata/shared/types/database'

/**
 * Browser client. Uses the anon key — RLS is what protects the data.
 *
 * Memoised: hooks call this on every render, and a fresh client per call
 * means a fresh auth listener and a fresh connection pool each time.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
