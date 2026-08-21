# Conventions

Follow these consistently. When Claude generates code, reference this file so it matches existing patterns.

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `expense-form.tsx`, `use-vendors.ts` |
| Components | PascalCase | `ExpenseForm`, `VendorCard` |
| Hooks | camelCase, `use` prefix | `useExpenses`, `useVendorSearch` |
| DB tables | snake_case, plural | `expenses`, `audit_log`, `user_profiles` |
| DB columns | snake_case | `created_by`, `void_reason` |
| TypeScript types | PascalCase | `Expense`, `Payment`, `UserProfile` |
| Zod schemas | camelCase, `Schema` suffix | `expenseSchema`, `paymentSchema` |
| Route files | Next.js App Router convention | `app/(app)/expenses/page.tsx` |
| API routes | `app/api/[resource]/route.ts` | `app/api/expenses/route.ts` |

---

## Folder structure (web)

```
apps/web/
├── app/
│   ├── (auth)/                 # Unauthenticated routes
│   │   ├── login/page.tsx
│   │   └── verify/page.tsx
│   ├── (app)/                  # Protected routes
│   │   ├── layout.tsx          # Sidebar, nav
│   │   ├── dashboard/page.tsx
│   │   ├── expenses/
│   │   │   ├── page.tsx        # List
│   │   │   ├── new/page.tsx    # Add expense
│   │   │   └── [id]/page.tsx   # Entry detail
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── audit/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── categories/page.tsx
│   │       └── users/page.tsx
│   ├── operator/               # Dev-only
│   │   ├── login/page.tsx
│   │   └── dashboard/page.tsx
│   └── api/
│       ├── operator/auth/route.ts
│       └── pin/verify/route.ts
├── components/
│   ├── ui/                     # shadcn (don't modify directly)
│   ├── expenses/
│   │   ├── expense-form.tsx
│   │   ├── expense-card.tsx
│   │   ├── expense-table.tsx
│   │   └── payment-form.tsx
│   ├── vendors/
│   ├── charts/
│   │   ├── category-donut.tsx
│   │   ├── monthly-bar.tsx
│   │   └── paid-unpaid-stack.tsx
│   └── shared/
│       ├── amount-display.tsx  # Always use this for money
│       ├── status-badge.tsx    # Always use this for paid/unpaid/partial
│       └── pin-dialog.tsx      # Reused for all PIN-gated actions
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server component client
│   │   └── middleware.ts       # Middleware client
│   ├── analytics.ts            # PostHog track() wrapper
│   ├── hooks/
│   │   ├── use-expenses.ts
│   │   ├── use-vendors.ts
│   │   └── use-current-user.ts
│   └── utils/
│       └── format.ts           # formatAmount, formatDate
└── types/
    └── index.ts                # Re-exports from packages/shared
```

---

## Amount formatting

Always use `formatAmount()`. Never format money inline.

```typescript
// packages/shared/utils/format.ts
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
  // Output: ₹2,50,000
}

export function formatLakh(amount: number): string {
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} lakh`
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
  return formatAmount(amount)
  // Output: "2.5 lakh" shown alongside the full amount
}
```

---

## Status badge

Always use the `<StatusBadge>` component for expense status. Consistent colour + label everywhere.

```typescript
// components/shared/status-badge.tsx
const STATUS_CONFIG = {
  unpaid:  { label: 'Not paid', className: 'bg-red-100 text-red-700' },
  partial: { label: 'Partly paid', className: 'bg-yellow-100 text-yellow-700' },
  paid:    { label: 'Paid', className: 'bg-green-100 text-green-700' },
}
```

---

## Data fetching pattern

Use TanStack Query for all data fetching. No raw `useEffect` for API calls.

```typescript
// lib/hooks/use-expenses.ts
export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => fetchExpenses(filters),
    staleTime: 30_000,    // 30 seconds
  })
}

// In component
const { data, isLoading, error } = useExpenses({ month: '2024-01', status: 'unpaid' })
```

---

## Supabase client usage

- Browser components → `createBrowserClient()`
- Server components / API routes → `createServerClient()`
- Never import the service role key in client-side code

```typescript
// lib/supabase/client.ts — for client components
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## PIN-gated actions

All PIN-gated actions go through the `<PinDialog>` component. Never build a custom PIN flow.

```typescript
// Usage
<PinDialog
  action="mark_paid"
  onConfirm={() => handleMarkPaid(expense.id)}
  trigger={<Button>Record payment</Button>}
/>
```

Internally, `PinDialog` calls `/api/pin/verify`, which calls the Edge Function. On success, it calls `onConfirm`. On failure, it increments the attempt counter and shows an error.

---

## Error handling

Wrap all Supabase calls and show a toast on failure. Never let errors fail silently.

```typescript
const { error } = await supabase.from('expenses').insert(data)
if (error) {
  toast.error('Could not save. Try again.')
  Sentry.captureException(error) // auto-reported
  return
}
```

---

## TypeScript types from database

Generate types from Supabase and use them everywhere:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/shared/types/database.ts
```

Re-run this whenever the schema changes. Never write DB types by hand.
