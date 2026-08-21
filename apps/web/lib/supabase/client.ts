'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@sitekhata/shared/types/database'

/** Browser client. Uses the anon key — RLS is what protects the data. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
