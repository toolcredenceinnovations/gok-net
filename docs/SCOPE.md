# GOK-NET — Scope

**One line:** A shared expense ledger for a construction site. Anyone on site can log what was spent, who paid, and whether it's cleared. The owner sees where the money went — by month, by category, by vendor.

**Working name:** GOK-NET. Alternatives if that doesn't land: *Nirman Ledger*, *Khata Works*, *SiteBook*.

**Not:** an accounting package, a GST filing tool, or a project management app. It feeds the CA at year end, it doesn't replace them.

---

## 1. Users and roles

4–6 people, all non-technical. Roles matter more than headcount.

| Role | Can do | Typical person |
|---|---|---|
| **Dev (operator)** | Full system access. Usage data, error logs, PostHog, operator admin panel. Invisible to all other users. | Suhail |
| **Owner (super admin)** | Everything. Manages users, categories, subcategories, budgets, sites. Holds the action password. | The developer |
| **Admin** | Everything except user/category management. Can mark paid, can void with the password. | Accountant / manager |
| **Member** | Create entries, upload invoices/challans, view everything. Cannot delete or mark paid. | Site engineer, supervisor |
| **Viewer** | Read-only. Dashboards and exports. | Partner, CA |

The Dev role is set via environment variable at deploy time — not a user record in the database. Credentials are never stored in the codebase or scope doc; set them in Supabase dashboard and your `.env.local` only.

### On the password

The ask was a shared password for delete and for unpaid→paid. That works, but by itself it's weak — once it leaks, the log says "Ramesh did it" when it was actually someone using Ramesh's phone.

**Recommendation:** keep the password, but layer it:
1. Role gate first — only Owner/Admin can even see the action.
2. Password prompt second — a 6-digit action PIN, set by the Owner, re-entered every time.
3. Every use is logged with user, timestamp, entry, and before/after values.

Same UX the user asked for. Two locks instead of one.

---

## 2. Core concepts

Five things. Everything else hangs off these.

**Site** — one construction project. Ships with one, but the schema supports many from day one. Adding this later means a painful migration; adding it now costs one column.

**Expense** — the thing that was spent on. Description, amount, category, subcategory, vendor, date, who recorded it. This is the entry the user fills.

**Payment** — money actually moving. Mode (cash / cheque / voucher), amount, date, who paid, remark, attachment. **An expense can have zero, one, or many payments.**

> This is the single most important structural change. Modelling paid/unpaid as a checkbox breaks the first time someone pays ₹2L against a ₹5L challan. As separate records, "unpaid" simply means payments total less than the expense amount, and part-payments work for free.

**Vendor** — who got paid. Name, phone, GSTIN (optional), category. Every expense optionally points at one.

**Attachment** — invoice or challan. Photo from the phone camera or a PDF.

Derived status: `Unpaid` (₹0 paid) → `Partly paid` → `Paid` (fully settled).

---

## 3. Feature scope

### P0 — must ship

**Entry capture**
- Big "+ Add expense" button, one screen, no wizard
- Fields: date (defaults to today), amount, description, category → subcategory, vendor (searchable, create-on-the-fly), paid or unpaid
- If paid: payment mode, who paid, remark, invoice upload
- If unpaid: challan number, due date, challan upload
- Camera capture on mobile, drag-drop on web
- Amounts in ₹ with Indian grouping (₹2,50,000) and a helper reading "2.5 lakh"

**Marking as paid**
- Open an unpaid entry → "Record payment" → PIN → mode, date, who paid, amount (defaults to full, editable for part-payments), remark, invoice upload
- Status updates automatically

**Categories**
- Fixed four: Admin, Civil, Marketing, Others
- Subcategories are Owner-managed, unlimited, per category
- Subcategories can be marked inactive, archived, or deleted — the database blocks deleting one still referenced by an expense, so old entries in use keep their history

**Void (not delete)**
- Nothing is ever hard-deleted. "Delete" marks the entry void, requires the PIN and a mandatory reason
- Voided entries drop out of totals but stay visible under a filter
- Owner can restore

**Views**
- **Month dashboard** — month picker at top. Total spent, total outstanding, split by category. Paid / Unpaid / Partly-paid tabs.
- **Charts** — category donut for the month, 12-month spend bar, paid vs outstanding stacked bar
- **All entries** — searchable, filterable table: date range, category, vendor, status, payment mode, who paid
- **Vendor page** — one vendor, full history, total billed, total paid, outstanding. Answers "how much did I pay ABC Traders this year?" in one tap.
- **Audit portal** — separate section, Owner + Admin only. Every create/edit/void/payment/login. Filterable by user, date, action. Append-only, no edit or delete, ever.

**Export**
- Month or date-range export to Excel, with attachment links. This is what goes to the CA.

### P1 — soon after

- **Settlement view** — the actual Splitwise part. Site engineers pay cash from their own pocket; this shows who has put in how much and what the company owes each person. Mark as reimbursed to clear.
- **Vendor aging** — outstanding grouped 0–30 / 31–60 / 61–90 / 90+ days. Turns "unpaid" into a collections list.
- **Cheque lifecycle** — cheque number, bank, status: Issued → Cleared / Bounced. A cheque isn't money until it clears.
- **Budget vs actual** — Owner sets a budget per category or subcategory for the site; dashboard shows burn %. This is the number the developer actually cares about.
- **Offline capture** — sites have bad signal. Entries queue locally and sync when connectivity returns, with a clear "3 pending" indicator.
- **WhatsApp share** — one-tap share of the month summary as an image or PDF.

### P2 — later, only if asked

- Approval flow (entries above a threshold need Owner sign-off)
- Duplicate detection (same vendor + amount + week → warn)
- GST / TDS fields (GSTIN, HSN, TDS section 194C) — add when the CA asks
- OCR on uploaded invoices to prefill amount and vendor
- Recurring expenses (rent, salaries)
- Push notifications for challans due this week

### Explicitly out of scope

Payroll, GST return filing, material inventory, work-progress tracking, client/booking management, bank reconciliation, multi-currency.

---

## 4. Screens

**Mobile (primary for members)**
1. Home — this month's totals, recent entries, big + button
2. Add expense
3. Entry detail — attachments, payment history, actions
4. All entries with filters
5. Vendors — list and detail
6. More — settlement, exports, settings

**Web (primary for owner/admin)**
Same plus:
7. Dashboard with charts
8. Audit portal
9. Category and subcategory management
10. User management
11. Budget setup

---

## 5. Data model

```
sites            id, name, address, created_at
users            id, name, phone, email, role, site_id, active
categories       id, name, is_system            -- the fixed four
subcategories    id, category_id, name, archived_at, inactive_at
vendors          id, site_id, name, phone, gstin, notes, archived
expenses         id, site_id, date, description, amount,
                 category_id, subcategory_id, vendor_id,
                 challan_no, due_date,
                 created_by, created_at,
                 status,                        -- derived: unpaid/partial/paid
                 voided_at, voided_by, void_reason
payments         id, expense_id, amount, mode,  -- cash/cheque/voucher
                 paid_by_user_id, paid_on, remark,
                 cheque_no, cheque_bank, cheque_status,
                 created_by, created_at
attachments      id, expense_id, payment_id, type, file_url, uploaded_by
audit_log        id, actor_id, action, entity, entity_id,
                 before_json, after_json, ip, created_at
budgets          id, site_id, category_id, subcategory_id, period, amount
```

Notes:
- `payments.paid_by_user_id` drives the settlement view
- Audit log is insert-only, enforced at the database level
- Attachments in object storage, never in the database

---

## 6. Security

- Auth: phone OTP or magic link. No passwords to forget — these users will forget passwords.
- Row Level Security at the database, not in app code. A member's query physically cannot return another site's rows.
- Action PIN stored hashed, verified server-side. Never checked in the client.
- Attachments in a private bucket, served via short-lived signed URLs.
- Audit log writes happen in database triggers, so they can't be skipped by a buggy screen.

---

## 7. Stack

Shared backend, two clients.

**Backend — Supabase**
Postgres, Auth, Storage, Row Level Security, Edge Functions. One backend serves web and mobile. RLS means security lives with the data, which is what keeps this safe with 4–6 people and no dedicated ops.

**Web — Next.js 16 (App Router) + TypeScript**
shadcn/ui, Tailwind, TanStack Query, react-hook-form + zod, Recharts. Ships as an installable PWA, so it's already usable on a phone before the native app exists. Deploy to Vercel. (This supersedes the original Vite plan — see `DECISIONS.md`.)

**Mobile — Expo (React Native)**
Same Supabase client, same TypeScript types. Camera, offline queue, push notifications. Ships to both stores from one codebase.

**Share types and business logic, not UI.** Put schema types, validation, and the status/settlement calculations in a shared package. Let each client own its own screens — forcing shared UI across web and native costs more than it saves.

**Order:** PWA first. Get it in their hands within a couple of weeks, watch how the site engineer actually uses it, then build the native app around what you learn. There's a real chance the PWA is enough and the app is only worth it for the camera and offline work.

---

## 8. Operator layer (for Suhail, invisible to users)

This layer is purely for keeping the app healthy. It answers three questions: is the data clean, is the app being used, is anything broken? None of this is visible to the 4–6 users.

### 8a. Operator admin panel — `/operator`

A protected route, only accessible with the Dev role. Not linked from any nav the users see.

**Data quality tab**
Flags entries that need attention — pulled from the database, not from PostHog:
- Entries older than 60 days still unpaid with no payment activity
- Paid entries missing an invoice attachment
- Expenses sitting in "Others" category for more than 14 days
- Same vendor + similar amount within 7 days (potential duplicate)
- "Others" as a % of total spend — if it's growing month-on-month, subcategories are missing

**Usage health tab**
Is the tool actually being used, or did they go back to WhatsApp after week two?
- Last login per user
- Entries created this week vs last week
- Any user with zero activity in 14 days

**Integrity tab**
Catches anything suspicious or broken:
- PIN used more than 3 times in a single day
- Entry created and voided within 24 hours (with reason)
- Attachments missing on entries marked paid (shouldn't be possible — catch it anyway)
- Entries edited after being marked paid

All of this is just smart queries over the audit log you're already writing. ~3–4 SQL views.

---

### 8b. PostHog — product analytics

Used to understand how the UI is actually being used, not the business data. Free tier covers 4–6 users for years.

**What to track — keep this list short**

```
expense_created        { category, has_vendor, status: paid|unpaid }
payment_recorded       { mode: cash|cheque|voucher, is_partial }
entry_voided           { reason_given: true|false }
pin_used               { action: mark_paid|void }
attachment_uploaded    { type: invoice|challan, source: camera|file }
export_triggered       { period: month|custom }
vendor_searched        { has_results: true|false }
login                  { role }
```

Eight events. Enough to know: which features are used, which are ignored, where people drop off.

**Session replay**
Turn this on from day one. When a user says "the app is confusing," you watch the recording instead of guessing. At this user count, storage cost is negligible.

**Alerts to set up**
- Zero `expense_created` events in any 48-hour window on a weekday → something is wrong or they've abandoned the tool
- Any spike in `pin_used` → unusual activity worth checking

---

### 8c. Sentry — error tracking

PostHog tracks behaviour. Sentry tracks breakage. They're complementary.

When something crashes, Sentry gives you: the exact line, the user's browser/device, the sequence of actions before the crash, and a stack trace. You get notified immediately, often before the user even reports it.

Both have React and Expo SDKs — wire them up in Phase 0 so you have coverage from the first real usage.

**Setup**
- Sentry DSN and PostHog API key go in environment variables only, never in the codebase
- Tag every Sentry event with `user_role` so you know if it's a Member or Owner hitting the bug
- Set Sentry alert threshold to 1 occurrence — at this scale, one error is already worth knowing about

---

### 8d. Observability stack summary

| Need | Tool | Cost |
|---|---|---|
| Usage analytics + session replay | PostHog | Free |
| Error tracking + alerting | Sentry | Free |
| Data quality + integrity | `/operator` route (your own app) | Already building |
| Crash notifications | Sentry email alerts | Free |

---

## 9. Build phases

| Phase | What | Rough time |
|---|---|---|
| 0 | Schema, RLS, auth, seed categories, wire up PostHog + Sentry | 2–3 days |
| 1 | Add entry, list, entry detail, attachments | 1 week |
| 2 | Payments, PIN gate, void, audit log | 1 week |
| 3 | Dashboard, charts, vendor pages, export | 1 week |
| 3.5 | `/operator` panel — data quality, usage health, integrity tabs | 2–3 days |
| 4 | Real usage on site, fix what breaks | 1–2 weeks |
| 5 | Expo app | 2 weeks |
| 6 | P1 features by demand | ongoing |

PostHog and Sentry go in Phase 0 — wire them before anyone uses the app so you have data from the first real session.

---

## 10. Design principles

1. **One screen per job.** No wizards, no tabs inside forms.
2. **Thumb-reachable.** The + button is bottom-right. The site engineer is standing, one-handed, in the sun.
3. **Photo first.** Snapping the bill should feel like the natural first step, not an afterthought.
4. **Money is big.** Amounts in large type. Everything else is secondary.
5. **Colour carries status.** Unpaid, partly paid, paid — consistent everywhere, plus a text label so it isn't colour-only.
6. **No jargon.** "Not paid yet", not "outstanding liability".
7. **Nothing disappears silently.** Every destructive action names what it's doing and asks for a reason.

---

## 11. Open questions for the client

1. ✅ **One site this year, more in future.** Site-wise data must be preserved — each site is its own isolated ledger. Users, expenses, vendors, and budgets are all scoped to a site. Switching between sites (for the Owner) shows a site-selector on login or in the nav. No cross-site data leaks.

2. ⏳ **Settlement — confirm with client.** If engineers pay from pocket and get reimbursed, settlement moves to P0. If not, it stays P1. Decision needed before Phase 1 ends.

3. ⏳ **Part-payments on challans — confirm with client.** If challans are always paid in full, the simpler paid/unpaid model works. If part-payments happen, the multi-payment model (already in the schema) handles it automatically.

4. ✅ **No CA export format needed for now.** Standard Excel export is sufficient. Can revisit if the CA asks for something specific later.

5. ✅ **Visibility clarified.** Members see **all** expenses on their site — they cannot do the job without seeing what the site already spent. What they do not get is the full spend-breakdown dashboard, which stays with Owner, Admin and Viewer (Partner/CA). Row access is an RLS policy; the dashboard restriction is a route + role gate. *(Corrected 21 Aug 2026: an earlier draft said members see only their own entries, which contradicted `AUTH.md` and the shipped RLS policy.)*

6. ⏳ **Existing records — confirm with client.** If there's an Excel or Tally file, get a copy before building the entry form — it's the best real-world spec for what fields actually matter and how they name things.
