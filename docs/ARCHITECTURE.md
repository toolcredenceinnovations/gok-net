# Architecture

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Web framework | Next.js 16 (App Router) + TypeScript | Consistent with FinDesk; SSR for fast dashboard load |
| UI components | shadcn/ui + Tailwind CSS | Same as FinDesk; unstyled components we control fully |
| Forms | react-hook-form + zod | Type-safe validation, matches schema |
| Data fetching | TanStack Query (React Query) | Caching, refetch on window focus, loading/error states |
| Charts | Recharts | Lightest option; good enough for donut + bar charts |
| Backend | Supabase | Postgres + Auth + Storage + RLS + Edge Functions — one service |
| Hosting (web) | Vercel | Free tier, GitHub auto-deploy, env var management |
| Mobile | Expo (React Native) | One codebase → iOS + Android; shares types with web |
| Analytics | PostHog | Free at this scale, session replay included |
| Error tracking | Sentry | Free, React + Expo SDKs, stack traces |

---

## Hosting

**Domain:** `sitekhata.credenceinnovations.com`

DNS setup:
1. In your domain registrar (wherever credenceinnovations.co is hosted), add a CNAME record:
   - Name: `sitekhata`
   - Value: `cname.vercel-dns.com`
2. In Vercel project settings → Domains → add `sitekhata.credenceinnovations.com`
3. Vercel handles SSL automatically

**Cost while it's one client:** ₹0/month
- Vercel free tier: unlimited for this traffic level
- Supabase free tier: 500MB DB, 1GB storage, 50,000 MAUs — won't be hit for months
- PostHog free tier: 1M events/month
- Sentry free tier: 5,000 errors/month

Upgrade to Supabase Pro ($25/month) only when adding a second paying client.

---

## Repository structure

```
sitekhata/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Login, OTP
│   │   │   ├── (app)/          # Protected app routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── expenses/
│   │   │   │   ├── vendors/
│   │   │   │   ├── audit/
│   │   │   │   └── settings/
│   │   │   └── operator/       # Dev-only, not in user nav
│   │   ├── components/
│   │   │   ├── ui/             # shadcn components
│   │   │   ├── expenses/       # Expense-specific components
│   │   │   ├── vendors/
│   │   │   ├── charts/
│   │   │   └── operator/
│   │   └── lib/
│   │       ├── supabase/       # Client, server, middleware
│   │       └── hooks/
│   └── mobile/                 # Expo app (Phase 5)
│       ├── app/                # Expo Router screens
│       ├── components/
│       └── lib/
└── packages/
    └── shared/                 # Shared between web + mobile
        ├── types/              # TypeScript types from DB schema
        ├── validation/         # Zod schemas
        └── utils/              # Status calc, amount formatting
```

**Monorepo tool:** Turborepo. Lets web and mobile share the `packages/shared` code without duplication.

---

## Modularity — serving future clients

Every piece of data is `site_id` scoped. A new client = a new Supabase project + a new Vercel environment pointing at it. The codebase is identical.

**`sites` table has a `settings_json` column** for per-client configuration:
```json
{
  "currency": "INR",
  "date_format": "DD/MM/YYYY",
  "features": {
    "settlement": false,
    "budget_tracking": false,
    "cheque_lifecycle": false
  },
  "plan": "basic"
}
```

Feature flags live here. When you add a second client on a different plan, you flip flags in their settings row — no code changes.

**Adding a new client checklist:**
1. Create new Supabase project (2 min)
2. Run migrations from `supabase/migrations/` (1 command)
3. Seed categories and create Owner user
4. Create new Vercel environment with that project's env vars
5. Point their subdomain at Vercel

That's it. 30 minutes to onboard a new client.

---

## MCPs for development (connect these to Claude)

### Essential — before writing code

| MCP | What Claude can do with it |
|---|---|
| **Supabase** | Read schema, write migrations, check RLS policies, query data |
| **Figma** | Read component specs, generate matching React code |
| **GitHub** | Read files, create branches, open PRs, maintain context across sessions |

### Useful — add when relevant

| MCP | When to add |
|---|---|
| **Vercel** | When debugging deployments or checking build logs |

### Skip for this project
Notion, Google Drive, Microsoft 365 — don't move this build forward.

**Development loop with Claude:**
1. Describe the feature in plain language
2. Claude reads Supabase schema via MCP → understands existing structure
3. Claude writes migration SQL + RLS policy + React component together
4. You review, push to GitHub
5. Vercel auto-deploys on push to `main`

---

## Key architectural decisions

See `DECISIONS.md` for the reasoning. Quick list:

- Payments are separate records, not a paid/unpaid boolean on expenses
- Nothing is hard-deleted — soft delete via `voided_at`
- Audit log is a database trigger, not app code
- PIN is verified server-side via Edge Function, never in the client
- Attachments are in a private Supabase Storage bucket, served via signed URLs
- RLS is the security layer — app code is a second layer, not the first
