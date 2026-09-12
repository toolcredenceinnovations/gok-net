# Operator Layer

This layer is invisible to the 4–6 users of the app. It exists so Suhail knows the app is healthy, the data is clean, and nothing is broken — without waiting for a user to report a problem.

Three parts: PostHog (product analytics), Sentry (error tracking), and the `/operator` panel (data health).

---

## PostHog

**Purpose:** Understand how the app is being used. Session replay for support.

**Setup:**

```typescript
// apps/web/app/layout.tsx
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    session_recording: { maskAllInputs: false }, // enable session replay
    loaded: (ph) => {
      if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') ph.opt_out_capturing()
    }
  })
}
```

Identify users on login so sessions are tied to a person:

```typescript
posthog.identify(user.id, {
  name: user.name,
  role: user.role,
  site_id: user.site_id
})
```

---

### Events to track

Eight events. Track these and nothing else — more events = more noise.

```typescript
// lib/analytics.ts
import posthog from 'posthog-js'

export const track = {
  expenseCreated: (props: { category: string; has_vendor: boolean; status: 'paid' | 'unpaid' }) =>
    posthog.capture('expense_created', props),

  paymentRecorded: (props: { mode: 'cash' | 'cheque' | 'voucher'; is_partial: boolean }) =>
    posthog.capture('payment_recorded', props),

  entryVoided: (props: { reason_given: boolean }) =>
    posthog.capture('entry_voided', props),

  pinUsed: (props: { action: 'mark_paid' | 'void' }) =>
    posthog.capture('pin_used', props),

  attachmentUploaded: (props: { type: 'invoice' | 'challan'; source: 'camera' | 'file' }) =>
    posthog.capture('attachment_uploaded', props),

  exportTriggered: (props: { period: 'month' | 'custom' }) =>
    posthog.capture('export_triggered', props),

  vendorSearched: (props: { has_results: boolean }) =>
    posthog.capture('vendor_searched', props),

  login: (props: { role: string }) =>
    posthog.capture('login', props),
}
```

Use these at the call site:

```typescript
// After creating an expense
track.expenseCreated({ category: 'Civil', has_vendor: true, status: 'unpaid' })
```

---

### Alerts to configure in PostHog

Go to PostHog → Alerts → New alert:

1. **App abandoned:** `expense_created` count = 0 for 48 consecutive hours on a weekday → email notification
2. **PIN spike:** `pin_used` count > 3 in a single day → email notification

---

## Sentry

**Purpose:** Know about errors before users report them.

**Setup (web):**

```bash
npx @sentry/wizard@latest -i nextjs
```

This wires up `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` automatically. Then add user context:

```typescript
// After login
Sentry.setUser({
  id: user.id,
  username: user.name,
  // do NOT include phone/email
})

// Tag every event with role — helps identify which role hits the bug
Sentry.setTag('user_role', user.role)
Sentry.setTag('site_id', user.site_id)
```

**Setup (mobile):**

```bash
npx @sentry/wizard@latest -i expo
```

**Sentry settings:**
- Alert threshold: 1 occurrence (at 4–6 users, one error matters)
- Assign all issues to yourself
- Turn on email + Slack notifications if you use Slack

---

## `/operator` panel

A protected Next.js route. Accessible only with the `OPERATOR_SECRET` env var. Not linked from any user-facing nav.

URL: `gok-net.credenceinnovations.com/operator`

---

### Login

Simple form. Submits the secret, sets a cookie, redirects to `/operator/dashboard`.

```typescript
// app/operator/login/page.tsx
// On submit, POST to /api/operator/auth
// API route checks against OPERATOR_SECRET, sets httpOnly cookie
```

---

### Tab 1: Data quality

Flags entries that need attention. Pulled fresh on every load.

| Check | Query |
|---|---|
| Unpaid > 60 days, no payment activity | `expenses where status != 'paid' and date < now() - interval '60 days' and id not in (select expense_id from payments)` |
| Paid entries missing invoice | `expenses where status = 'paid' and id not in (select expense_id from attachments where type = 'invoice')` |
| Sitting in "Others" > 14 days | `expenses where category = 'Others' and created_at < now() - interval '14 days'` |
| Potential duplicates | `expenses e1 join expenses e2 on e1.vendor_id = e2.vendor_id and e1.id != e2.id and abs(e1.amount - e2.amount) < 100 and abs(e1.date - e2.date) < 7` |

Each flag shows: expense description, amount, date, who created it, and a link to the entry.

---

### Tab 2: Usage health

| Metric | Query |
|---|---|
| Last login per user | `audit_log where action = 'login' group by actor_id` |
| Entries this week vs last | Count of `expenses.created_at` in current vs previous 7 days |
| Users inactive > 14 days | `user_profiles where id not in (select actor_id from audit_log where created_at > now() - interval '14 days')` |

If any user has been inactive > 14 days, show a yellow flag. It probably means they stopped using the app and went back to WhatsApp.

---

### Tab 3: Integrity

| Check | Query |
|---|---|
| PIN used > 3 times today | `audit_log where action = 'pin_used' and created_at > today group by actor_id having count(*) > 3` |
| Entry voided within 24h of creation | `audit_log where action = 'voided' join expenses on entity_id = expenses.id where voided_at - created_at < interval '24 hours'` |
| Paid entry missing attachment (double check) | Same as data quality tab |

Any integrity flag is shown in red. It doesn't mean something is wrong — it means look closer.

---

### Operator panel stack

No additional libraries needed. It's just:
- A protected Next.js route group `app/(operator)/`
- Direct Supabase queries using the service role key (bypasses RLS — operator sees everything)
- Simple HTML tables, no charts needed
- shadcn `Table`, `Badge`, `Tabs` components

Keep it functional. This is for you at 7am checking if everything is okay, not a product screen.
