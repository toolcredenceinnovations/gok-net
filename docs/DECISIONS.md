# Decisions

The non-obvious calls and why we made them. Read this before questioning a pattern.

---

## Payments are separate records, not a boolean

**What we didn't do:** `expenses.is_paid boolean`

**What we did:** `payments` table with one row per payment transaction

**Why:** A boolean breaks the first time someone pays ₹2L against a ₹5L challan. Part-payments, multiple payment modes for one expense, and payment history all require payments as separate records. The `status` column on `expenses` is derived — computed by a trigger whenever a payment is added. It's a cache for query performance, not the source of truth.

---

## Void, not delete

**What we didn't do:** `DELETE FROM expenses WHERE id = ?`

**What we did:** `voided_at`, `voided_by`, `void_reason` columns. Nothing is hard-deleted.

**Why:** This is an accounting ledger. A ledger with holes in it is untrustworthy. The CA or owner should be able to look back and see everything that ever happened, including what was cancelled and why. Voided entries are excluded from totals by default but remain visible with a filter.

---

## Audit log in a database trigger, not app code

**What we didn't do:** Write to `audit_log` in the React component or API route after a successful operation.

**What we did:** Postgres trigger on `expenses`, `payments`, `vendors` tables.

**Why:** App code can have bugs. A screen can fail to call the audit function, or a developer can forget to add it to a new code path. A database trigger fires on every write, unconditionally, regardless of which client or which person triggered it. The audit log is the one thing that must be correct.

---

## RLS is the security layer, not the app

**What we didn't do:** Filter by `site_id` in every query in the app.

**What we did:** RLS policies on every table. The app's queries don't need to filter by site — the database simply won't return rows from other sites.

**Why:** If someone calls the Supabase API directly with their auth token (bypassing the UI), they still only see their site's data. Security at the app layer means security only when the app is behaving. Security at the database layer means always.

---

## PIN verified server-side, never client-side

**What we didn't do:** Store the PIN hash in localStorage or check it in JavaScript.

**What we did:** Edge Function verifies the PIN. Client never sees the hash.

**Why:** Client-side PIN checks are trivially bypassable. Any developer tools inspection or modified request would skip it. The Edge Function is the only code path that can verify and approve a PIN-gated action. Even if the PIN function is called directly, the RLS policies still block the underlying write if the caller doesn't have the right role.

---

## Next.js over Vite

**What the scope initially said:** Vite + React

**What we're using:** Next.js 16 (App Router)

**Why:** Suhail already built FinDesk in Next.js. No new framework to learn. Server components give faster initial load for the dashboard. File-based routing is easier to reason about when Claude is generating code across sessions. The PWA setup is slightly more complex but there are established patterns.

---

## Separate Supabase projects per client, not multi-tenant in one project

**What we could have done:** One Supabase project, all clients in one database, separated by `site_id` and RLS.

**What we're doing:** One Supabase project per paying client.

**Why for now:** At 1–3 clients, the operational overhead is trivial (2 minutes to set up a new project). The data isolation is absolute — no RLS misconfiguration can leak one client's data to another. When you get to 10+ clients, revisit.

---

## Phone OTP, not passwords

**What we didn't do:** Username + password auth.

**What we did:** Phone OTP for members, magic link for Owner/Admin.

**Why:** Site engineers and contractors are not going to remember a password they created once for an internal tool. They will click "forgot password" every single time, which is a support burden on Suhail. OTP means their phone is the credential. Magic link means email is the credential. Neither requires remembering anything.

---

## `settings_json` on the sites table

**What we did:** A JSONB column for per-site configuration including feature flags and the PIN hash.

**Why:** Feature flags and configuration are different for every client. A JSONB column avoids adding a new column every time a setting is introduced. The PIN hash lives here because it's per-site, needs to be server-only (never returned to client), and doesn't need to be indexed or queried across rows.

---

## Roles live on `user_sites`, not `user_profiles`

**What the schema first said:** `user_profiles.site_id` and `user_profiles.role` — one site, one role, per user.

**What we did:** a `user_sites (user_id, site_id, role)` join table, plus `user_profiles.active_site_id` for the site currently being viewed.

**Why:** `SCOPE.md` Q1 promises the Owner a site switcher, and a single `site_id` column cannot express that. Role moved onto the membership row because a person can legitimately be admin on one site and member on another. `current_user_site_id()` and `current_user_role()` read from the active site, so every RLS policy keeps working unchanged. One table now beats a migration across nine RLS policies later.

---

## The PIN gate performs the write, it does not authorise one

**What `AUTH.md` sketched:** the Edge Function verifies the PIN and returns an `action_token` for the client to spend on the real write.

**What we did:** the PIN-gated write happens *inside* the server route, using the service role, only after `bcrypt.compare` succeeds.

**Why:** the token in the original sketch was never stored or verified — the doc itself said "or just trust the response". A token the server does not check is not a lock. More importantly, the database now makes the safe path the only path: `payments` grants no `insert` to `authenticated`, and the void columns on `expenses` are excluded from that role's column grants. So there is no request a client can craft that records a payment or voids an entry. The service role is the sole route through, and it is only reached after the PIN checks out.

**Consequence:** never add an `insert` policy on `payments` for `authenticated`, and never widen the `update` grant on `expenses` to include `voided_at`, `voided_by`, `void_reason` or `status`. Doing either silently removes the PIN requirement.

---

## Next.js 16, not 14

**What the docs said:** Next.js 14.

**What we're using:** Next.js 16.3.2.

**Why:** 14 was current when the docs were written. By the time we scaffolded, 16 was `latest` and 14's last release (14.2.35) was two majors back and outside its patch window. The reasoning in the original decision — "no new framework to learn" — is satisfied by any Next version; the `14` was incidental. Starting a greenfield app that has to run for years on an unpatched major would have bought a migration for nothing.

---

## Voided rows stay visible to the security policy

**What `DATABASE.md` had:** `... using (site_id = current_user_site_id() and voided_at is null)`.

**What we did:** dropped the `voided_at is null` clause from the RLS policy. Voided rows are filtered out in the views and queries instead.

**Why:** with it, nobody could see a voided entry under a filter and the Owner could never restore one — both of which the scope requires. Whether a voided row is *shown* is a product decision that belongs in the query; whether it may be *read at all* is the security decision, and those are not the same question.
