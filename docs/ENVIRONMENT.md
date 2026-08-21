# Environment Variables

All secrets live in environment variables. Nothing sensitive in the codebase or in git.

---

## Where to set them

| Environment | Where |
|---|---|
| Local dev | `.env.local` in `apps/web/` (gitignored) |
| Production | Vercel project settings → Environment Variables |
| Supabase Edge Functions | Supabase dashboard → Settings → Edge Functions → Secrets |

`.env.local` is in `.gitignore`. If it ever gets committed, rotate all keys immediately.

---

## Web app (`apps/web/.env.local`)

```bash
# ─── Supabase ───────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...          # safe to be public, RLS protects the data
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...               # NEVER expose this client-side

# ─── Operator / Dev access ──────────────────────────────
OPERATOR_SECRET=set-a-long-random-string-here         # protects /operator route

# ─── PostHog ────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ─── Sentry ─────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=sitekhata-web
SENTRY_AUTH_TOKEN=sntrys_xxxx                         # for source map uploads only

# ─── App config ─────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://sitekhata.credenceinnovations.com
NEXT_PUBLIC_APP_ENV=production                        # development | staging | production
```

---

## Mobile app (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
```

Note: `EXPO_PUBLIC_` prefix makes vars available client-side in Expo. Never put secrets here.

---

## Supabase Edge Function secrets

Set these in Supabase dashboard → Settings → Edge Functions:

```
SUPABASE_SERVICE_ROLE_KEY    # for admin operations in edge functions
```

---

## Variable reference

| Variable | Public? | What it does |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project endpoint |
| `SUPABASE_ANON_KEY` | Yes | Client-side queries; RLS handles security |
| `SUPABASE_SERVICE_ROLE_KEY` | **NO** | Bypasses RLS; server/edge functions only |
| `OPERATOR_SECRET` | **NO** | Password for `/operator` route |
| `POSTHOG_KEY` | Yes | PostHog project key |
| `SENTRY_DSN` | Yes | Where Sentry sends errors |
| `SENTRY_AUTH_TOKEN` | **NO** | Source map upload only; CI/build only |

---

## Generating secrets

For `OPERATOR_SECRET`, generate a random string:

```bash
# In terminal
openssl rand -hex 32
```

Don't use a memorable word or phrase. This is the only key protecting the operator panel.

---

## Rotating keys

If any secret is exposed (committed to git, shared accidentally):

1. `SUPABASE_SERVICE_ROLE_KEY` → Supabase dashboard → Settings → API → Rotate
2. `OPERATOR_SECRET` → change in Vercel env vars → redeploy
3. `SENTRY_AUTH_TOKEN` → Sentry dashboard → Settings → Auth Tokens → revoke + create new
4. `POSTHOG_KEY` → PostHog dashboard → Project settings → rotate API key

After rotating, redeploy on Vercel so the new values are picked up.
