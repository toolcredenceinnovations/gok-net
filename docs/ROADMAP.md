# Roadmap

## Phase 0 — Foundation (2–3 days)

Get the infrastructure in place before writing a single feature screen.

- [x] Create Supabase project
- [x] Run schema migrations (see `DATABASE.md`)
- [x] Seed categories (Admin, Civil, Marketing, Others)
- [ ] Set up Supabase Auth — enable Phone OTP + Magic Link *(dashboard config; both client flows are built)*
- [x] Create Supabase Storage bucket (`attachments`, private)
- [x] Set up Next.js project with TypeScript + Turborepo monorepo (Next **16**, see `DECISIONS.md`)
- [x] Install and configure shadcn/ui + Tailwind
- [x] Wire up Supabase client (browser + server + proxy — `middleware.ts` is `proxy.ts` in Next 16)
- [x] Generate TypeScript types from schema
- [ ] Set up environment variables *(local done; Vercel outstanding)*
- [ ] Connect domain `gok-net.credenceinnovations.com` to Vercel
- [x] Install and configure PostHog (init + identify)
- [x] Install and configure Sentry (Next.js wizard)
- [ ] Set up GitHub repo + Vercel auto-deploy on push to `main`
- [x] Connect MCPs: Supabase, Figma, GitHub, Vercel

**Done when:** You can push code, it deploys automatically, PostHog sees a pageview, Sentry is wired.

> **Status, 1 Sep 2026.** Migrations are applied to `eqofdedstkagqkfnksac` (11 tables,
> 28 RLS policies, 5 views, 41 indexes, 10 triggers, private `attachments` bucket) and the
> grant-level security invariants are verified against the live database. Types are
> regenerated. Sentry and toasts are wired. The data-access layer (`lib/hooks/`,
> `lib/auth/session.ts`) exists and the app shell reads the real session. What is NOT done is
> Phase 1: the feature screens still render mock data — see `components/product/product-screens.tsx`.

---

## Phase 1 — Core entry (1 week)

The minimum thing that's actually useful: logging an expense.

- [ ] Login screen (phone OTP flow)
- [ ] App layout: sidebar (web) + bottom nav (mobile-sized)
- [ ] Add expense form
  - [ ] Date picker (defaults to today)
  - [ ] Amount input with ₹ formatting + lakh helper
  - [ ] Category → subcategory selector
  - [ ] Vendor search + create-on-the-fly
  - [ ] Paid / Unpaid toggle
  - [ ] If paid: mode selector, who paid, remark
  - [ ] If unpaid: challan number, due date
  - [ ] Attachment upload (file picker; camera on mobile — Phase 5)
- [ ] Expenses list with basic filters (status, category, date range)
- [ ] Expense detail page (view fields, attachments, payment history)
- [ ] Vendor list
- [ ] Vendor detail (transaction history, totals)

**Done when:** A site engineer can log an expense and the owner can see it.

---

## Phase 2 — Payments, PIN, void (1 week)

The trust layer. Money actually moving, and the gates around destructive actions.

- [ ] Action PIN setup (Owner sets 6-digit PIN during onboarding)
- [ ] PIN verify Edge Function
- [ ] `<PinDialog>` reusable component
- [ ] Record payment flow (PIN-gated)
  - [ ] Amount (defaults to full, editable for part-payment)
  - [ ] Mode: cash / cheque / voucher
  - [ ] Cheque fields (if cheque: number, bank)
  - [ ] Remark
  - [ ] Invoice upload
  - [ ] Expense status auto-updates via trigger
- [ ] Void entry flow (PIN-gated, mandatory reason)
- [ ] Restore voided entry (Owner only)
- [ ] Audit log viewer (Owner + Admin only)
  - [ ] Filterable by user, date, action type
  - [ ] Shows before/after state for edits

**Done when:** Payments are tracked, voiding works, and the audit trail is clean.

---

## Phase 3 — Dashboard and exports (1 week)

The thing the owner opens every morning.

- [ ] Month dashboard
  - [ ] Month picker
  - [ ] Total spent, total outstanding, total paid cards
  - [ ] Paid / Unpaid / Partial tabs with counts
  - [ ] Category breakdown table
- [ ] Charts
  - [ ] Category donut (this month's spend by category)
  - [ ] 12-month spend bar chart
  - [ ] Paid vs outstanding stacked bar
- [ ] Excel export (month or date range, includes attachment links)
- [ ] Subcategory management (Owner: add, archive, reorder)
- [ ] User management (Owner: invite, change role, deactivate)

**Done when:** Owner can see where money went this month and export it.

---

## Phase 3.5 — Operator panel (2–3 days)

For Suhail. Not for the client.

- [ ] `/operator` login (OPERATOR_SECRET cookie)
- [ ] Data quality tab (5 checks from `OPERATOR.md`)
- [ ] Usage health tab (last login, weekly entry counts, inactive users)
- [ ] Integrity tab (PIN spike, quick void, missing attachments)
- [ ] PostHog alerts configured (app abandoned, PIN spike)
- [ ] Sentry alerts configured (threshold: 1 occurrence)

**Done when:** Suhail can open `/operator` and know in 30 seconds if anything needs attention.

---

## Phase 4 — Real usage, fixes (1–2 weeks)

Put it in front of the client. Watch what breaks.

- [ ] Deploy to production with real data
- [ ] Watch PostHog session replays from first week
- [ ] Fix anything confusing before they give up
- [ ] Confirm with client: settlement needed? Part-payments happen?
- [ ] Add P1 features based on what actually comes up

**Done when:** The client's team is using it without calling Suhail for help.

---

## Phase 5 — Expo mobile app (2 weeks)

Build the native app once you know how they actually use the PWA.

- [ ] Set up Expo (React Native) in `apps/mobile/`
- [ ] Share types from `packages/shared`
- [ ] Same Supabase client, same auth
- [ ] Camera capture for attachments (the main reason to build native)
- [ ] Offline queue for entries (sites have bad signal)
  - [ ] Queue to AsyncStorage, sync on reconnect
  - [ ] Clear "3 pending" indicator in the UI
- [ ] Sentry + PostHog wired up
- [ ] EAS Build setup (iOS + Android)
- [ ] Submit to App Store + Play Store

**Done when:** Site engineer can add an entry offline, it syncs when they step back into signal.

---

## Phase 6 — P1 features (ongoing, by demand)

Only build these when the client asks, not before.

- [ ] Settlement view (who paid from pocket, what the company owes each person)
- [ ] Vendor aging (0–30 / 31–60 / 61–90 / 90+ days outstanding)
- [ ] Cheque lifecycle (Issued → Cleared / Bounced)
- [ ] Budget vs actual (Owner sets budgets per category, dashboard shows burn %)
- [ ] WhatsApp share (month summary as image/PDF)

---

## Client open questions (must resolve before Phase 2 ends)

- [ ] **Settlement:** Do site engineers pay from their own pocket and get reimbursed? If yes, moves to P0.
- [ ] **Part-payments:** Are challans ever paid in partial amounts, or always in full?
- [ ] **Existing data:** Is there an Excel or Tally file with existing records to migrate?
