# SiteKhata

A shared expense ledger for construction sites. Log what was spent, who paid, and whether it's
cleared. The owner sees where the money went — by month, by category, by vendor.

**Built by:** Credence Innovations · **Operator:** Suhail Khira

Think Splitwise, but for a business. Every rupee logged, every payment tracked, nothing deleted —
just voided with a reason.

---

## Repo layout

```
apps/web/            Next.js 16 (App Router) — owner/admin primary, ships as a PWA
apps/mobile/         Expo / React Native — site engineers (camera + offline)
packages/shared/     types, zod schemas, money + status logic. Used by BOTH clients.
supabase/migrations/ schema, RLS, triggers, storage — applied in filename order
supabase/tests/      RLS regression suite
docs/                the specs. Read ARCHITECTURE → DATABASE → AUTH → CONVENTIONS.
```

## Stack

Web: Next.js 16 + TypeScript + shadcn/ui + Tailwind CSS. Mobile: Expo + Expo UI. Both clients
share platform-neutral types, validation, and business logic through `packages/shared`, with
Supabase providing Postgres, Auth, Storage, and RLS. PostHog handles usage analytics and Sentry
handles error tracking.

---

## Getting started

```bash
npm install

cp apps/web/.env.example    apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
# fill in the Supabase keys — see docs/ENVIRONMENT.md

npm run dev:web       # http://localhost:3000
npm run dev:mobile    # Expo
```

**Supabase project:** `eqofdedstkagqkfnksac` (region `ap-south-1`, org Credence Innovation).

### First-time site setup

The schema ships with no sites. After the Owner has signed in once (so Supabase Auth has created
their user), fill in the placeholders at the top of `supabase/seed_site.sql` and run it once. It
creates the site, the Owner membership, a starter set of subcategories, and hashes the action PIN.

### Regenerating database types

Never hand-write them.

```bash
supabase login
SUPABASE_PROJECT_ID=eqofdedstkagqkfnksac npm run db:types
```

### Running the RLS tests

```bash
npm run db:test       # needs DATABASE_URL; rolls back, safe to re-run
```

---

## Things that will bite you if you don't know them

- **`payments` has no insert policy for `authenticated`, and that is deliberate.** Recording a
  payment or voiding an entry only works through `POST /api/pin/verify`, which checks the PIN and
  then writes as the service role. Adding an insert policy would silently remove the PIN gate.
- **The audit log is append-only, enforced by trigger — including for the service role.** There is
  no code path that can edit or delete it.
- **`status` on `expenses` is a cache, not the truth.** It is derived from non-voided payments by a
  trigger. `packages/shared/src/utils/status.ts` mirrors that rule for optimistic UI; change one,
  change both.
- **RLS keys off the *active* site** (`user_profiles.active_site_id`), not a fixed one. A user can
  belong to several sites with a different role on each.

---

## Docs

| File | What it covers |
|---|---|
| `docs/SCOPE.md` | Product scope — features, phases, open client questions |
| `docs/ARCHITECTURE.md` | Stack rationale, hosting, repo structure, MCPs |
| `docs/DATABASE.md` | Schema narrative (see `supabase/migrations/` for what actually shipped) |
| `docs/AUTH.md` | Auth flow, roles, PIN gate, sessions |
| `docs/ENVIRONMENT.md` | Every env var and where it goes |
| `docs/OPERATOR.md` | PostHog, Sentry, the `/operator` panel |
| `docs/CONVENTIONS.md` | Naming, folder structure, patterns |
| `docs/DECISIONS.md` | Why the non-obvious calls were made — read before questioning a pattern |
| `docs/ROADMAP.md` | Build phases |
