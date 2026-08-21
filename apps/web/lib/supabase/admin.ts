import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sitekhata/shared/types/database'

/**
 * Service-role client. BYPASSES RLS — every guard in the database is off.
 *
 * Only two things may use it:
 *   1. the /operator panel, which is meant to see across everything
 *   2. the PIN-gated payment/void path, which is the only way those writes
 *      can happen at all (payments has no insert policy for authenticated)
 *
 * The `server-only` import above makes the build fail if this is ever
 * imported into a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
