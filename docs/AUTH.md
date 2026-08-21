# Auth

## Sign-in methods

| Method | Who uses it | Why |
|---|---|---|
| Phone OTP (SMS) | Members, site engineers | They forget passwords. OTP = one tap. |
| Magic link (email) | Owner, Admin, Dev | Desktop-friendly, still passwordless |

No Google/Microsoft OAuth. No password-based login. Neither is worth the complexity for this audience.

Supabase Auth handles both methods natively. No third-party auth service needed.

---

## Roles

Five roles. Four are database records. One (Dev) is an environment variable.

```
dev     → set via OPERATOR_SECRET env var. Not in the DB.
owner   → super admin. Manages users, categories, PIN, sites.
admin   → can do everything except user/category management.
member  → can create entries, upload attachments, view all site data.
viewer  → read-only. Dashboards, exports only.
```

Role is stored in `user_profiles.role`. Checked in RLS policies at the database level.

**What each role can do:**

| Action | dev | owner | admin | member | viewer |
|---|---|---|---|---|---|
| View all expenses | ✅ | ✅ | ✅ | ✅* | ✅ |
| Create expense | — | ✅ | ✅ | ✅ | ❌ |
| Upload attachment | — | ✅ | ✅ | ✅ | ❌ |
| Record payment (PIN) | — | ✅ | ✅ | ❌ | ❌ |
| Void entry (PIN) | — | ✅ | ✅ | ❌ | ❌ |
| Restore voided entry | — | ✅ | ❌ | ❌ | ❌ |
| Manage subcategories | — | ✅ | ❌ | ❌ | ❌ |
| Manage users | — | ✅ | ❌ | ❌ | ❌ |
| View audit log | — | ✅ | ✅ | ❌ | ❌ |
| Export to Excel | — | ✅ | ✅ | ❌ | ✅ |
| Access /operator | ✅ | ❌ | ❌ | ❌ | ❌ |

*Members see all site expenses and category totals, but not the full spend breakdown dashboard.

---

## Dev / Operator access

The Dev role is not in the database. It's verified in middleware:

```typescript
// middleware.ts
if (pathname.startsWith('/operator')) {
  const token = request.cookies.get('operator_token')?.value
  if (token !== process.env.OPERATOR_SECRET) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

`OPERATOR_SECRET` is set in Vercel's environment variables dashboard. It is never in the codebase.

The `/operator` login screen is a separate page, not linked from anywhere in the app UI.

---

## Action PIN

Two actions require a PIN beyond just being logged in:
1. Marking unpaid → paid (recording a payment)
2. Voiding an entry

**How it works:**

1. Owner sets the PIN during setup (6 digits, stored hashed via bcrypt)
2. PIN hash is stored in `sites.settings` — never returned to the client
3. Verification happens in a Supabase Edge Function:

```typescript
// supabase/functions/verify-pin/index.ts
import bcrypt from 'bcryptjs'

Deno.serve(async (req) => {
  const { pin, site_id } = await req.json()
  const { data: site } = await supabase
    .from('sites')
    .select('settings')
    .eq('id', site_id)
    .single()

  const valid = await bcrypt.compare(pin, site.settings.pin_hash)

  if (!valid) {
    // log failed attempt to audit_log
    await logAudit({ action: 'pin_failed', entity: 'sites', entity_id: site_id })
    return new Response(JSON.stringify({ valid: false }), { status: 200 })
  }

  // return a short-lived token the client uses for the action
  const actionToken = crypto.randomUUID()
  // store in Redis/KV with 60s expiry — or just trust the response and verify role in RLS
  return new Response(JSON.stringify({ valid: true, action_token: actionToken }), { status: 200 })
})
```

The PIN is never checked in client-side code. If someone bypasses the UI, the RLS policy still blocks the database write.

---

## Session management

- Session expiry: 7 days (set in Supabase Auth settings)
- On web: session stored in localStorage by Supabase client (default)
- On mobile (Expo): session stored in `expo-secure-store` — encrypted on device

```typescript
// Mobile: custom storage adapter for Supabase
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const supabase = createClient(url, anonKey, {
  auth: { storage: ExpoSecureStoreAdapter }
})
```

---

## Middleware (web)

Protect all `/app/*` routes. Redirect to login if no valid session.

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie helpers */ } }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Operator route — separate check
  if (request.nextUrl.pathname.startsWith('/operator')) {
    const token = request.cookies.get('operator_token')?.value
    if (token !== process.env.OPERATOR_SECRET) {
      return NextResponse.redirect(new URL('/operator/login', request.url))
    }
    return response
  }

  // App routes
  if (!session && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/operator/:path*']
}
```
