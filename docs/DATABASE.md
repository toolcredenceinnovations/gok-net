# Database

Supabase (Postgres). Every table has RLS enabled. Default policy is deny-all — access is explicitly granted.

---

## Schema

```sql
-- ─────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────
create table sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  slug        text unique not null,           -- used in URLs
  plan        text not null default 'basic',  -- basic | pro
  settings    jsonb not null default '{}',    -- feature flags, currency, etc.
  created_at  timestamptz not null default now(),
  archived_at timestamptz                     -- soft delete for site
);

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
-- Supabase Auth handles credentials.
-- This table holds app-level profile and role.
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  site_id     uuid not null references sites(id),
  name        text not null,
  phone       text,
  role        text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CATEGORIES (fixed four, seeded)
-- ─────────────────────────────────────────
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,               -- Admin, Civil, Marketing, Others
  is_system   boolean not null default true
);

-- ─────────────────────────────────────────
-- SUBCATEGORIES (owner-managed)
-- ─────────────────────────────────────────
create table subcategories (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references sites(id),
  category_id  uuid not null references categories(id),
  name         text not null,
  archived_at  timestamptz,               -- archived, never deleted
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- VENDORS
-- ─────────────────────────────────────────
create table vendors (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id),
  name        text not null,
  phone       text,
  gstin       text,
  notes       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────
create table expenses (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references sites(id),
  date             date not null,
  description      text not null,
  amount           numeric(12, 2) not null check (amount > 0),
  category_id      uuid not null references categories(id),
  subcategory_id   uuid references subcategories(id),
  vendor_id        uuid references vendors(id),
  challan_no       text,
  due_date         date,
  -- status is derived, stored for query performance
  -- recomputed by trigger on payments insert/update
  status           text not null default 'unpaid'
                   check (status in ('unpaid', 'partial', 'paid')),
  created_by       uuid not null references user_profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- soft delete / void
  voided_at        timestamptz,
  voided_by        uuid references user_profiles(id),
  void_reason      text
);

-- ─────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────
create table payments (
  id               uuid primary key default gen_random_uuid(),
  expense_id       uuid not null references expenses(id),
  amount           numeric(12, 2) not null check (amount > 0),
  mode             text not null check (mode in ('cash', 'cheque', 'voucher')),
  paid_by          uuid not null references user_profiles(id),
  paid_on          date not null,
  remark           text,
  -- cheque-specific (null for cash/voucher)
  cheque_no        text,
  cheque_bank      text,
  cheque_status    text check (cheque_status in ('issued', 'cleared', 'bounced')),
  created_by       uuid not null references user_profiles(id),
  created_at       timestamptz not null default now(),
  voided_at        timestamptz,
  voided_by        uuid references user_profiles(id),
  void_reason      text
);

-- ─────────────────────────────────────────
-- ATTACHMENTS
-- ─────────────────────────────────────────
create table attachments (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid references expenses(id),
  payment_id    uuid references payments(id),
  type          text not null check (type in ('invoice', 'challan', 'other')),
  file_url      text not null,             -- path in Supabase Storage
  uploaded_by   uuid not null references user_profiles(id),
  uploaded_at   timestamptz not null default now(),
  constraint    one_parent check (
                  (expense_id is not null and payment_id is null) or
                  (expense_id is null and payment_id is not null)
                )
);

-- ─────────────────────────────────────────
-- AUDIT LOG (insert-only, never update/delete)
-- ─────────────────────────────────────────
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references user_profiles(id),  -- null for system actions
  action      text not null,              -- created | updated | voided | restored | payment_recorded | pin_used | login
  entity      text not null,              -- expenses | payments | vendors | users | subcategories
  entity_id   uuid not null,
  before_json jsonb,
  after_json  jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- BUDGETS
-- ─────────────────────────────────────────
create table budgets (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references sites(id),
  category_id      uuid not null references categories(id),
  subcategory_id   uuid references subcategories(id),
  period           text not null,          -- '2024-01', '2024-Q1', '2024' (month/quarter/year)
  amount           numeric(12, 2) not null,
  created_by       uuid not null references user_profiles(id),
  created_at       timestamptz not null default now()
);
```

---

## Seed data

Run this once after creating the Supabase project:

```sql
insert into categories (name, is_system) values
  ('Admin', true),
  ('Civil', true),
  ('Marketing', true),
  ('Others', true);
```

---

## Triggers

### 1. Auto-update expense status

When a payment is added, edited, or voided, recompute the expense status.

```sql
create or replace function recompute_expense_status()
returns trigger language plpgsql as $$
declare
  total_paid numeric;
  expense_amount numeric;
begin
  -- get expense amount
  select amount into expense_amount
  from expenses where id = coalesce(NEW.expense_id, OLD.expense_id);

  -- sum active payments
  select coalesce(sum(amount), 0) into total_paid
  from payments
  where expense_id = coalesce(NEW.expense_id, OLD.expense_id)
    and voided_at is null;

  -- update status
  update expenses set
    status = case
      when total_paid = 0 then 'unpaid'
      when total_paid >= expense_amount then 'paid'
      else 'partial'
    end,
    updated_at = now()
  where id = coalesce(NEW.expense_id, OLD.expense_id);

  return NEW;
end;
$$;

create trigger on_payment_change
after insert or update or delete on payments
for each row execute function recompute_expense_status();
```

### 2. Audit log trigger (append-only)

Fires on every write to key tables. Audit log itself has no trigger — it's insert-only by design.

```sql
create or replace function write_audit_log()
returns trigger language plpgsql security definer as $$
begin
  insert into audit_log (actor_id, action, entity, entity_id, before_json, after_json)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$;

-- Apply to key tables
create trigger audit_expenses
after insert or update or delete on expenses
for each row execute function write_audit_log();

create trigger audit_payments
after insert or update or delete on payments
for each row execute function write_audit_log();

create trigger audit_vendors
after insert or update or delete on vendors
for each row execute function write_audit_log();
```

### 3. Block audit log modification

```sql
create or replace function block_audit_modification()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit log is append-only. Updates and deletes are not permitted.';
end;
$$;

create trigger protect_audit_log
before update or delete on audit_log
for each row execute function block_audit_modification();
```

---

## Row Level Security (RLS)

Enable RLS on every table:

```sql
alter table sites enable row level security;
alter table user_profiles enable row level security;
alter table subcategories enable row level security;
alter table vendors enable row level security;
alter table expenses enable row level security;
alter table payments enable row level security;
alter table attachments enable row level security;
alter table audit_log enable row level security;
alter table budgets enable row level security;
-- categories has no RLS — it's read-only global data
```

Key policies:

```sql
-- Helper function: get current user's site_id and role
create or replace function current_user_site_id()
returns uuid language sql stable as $$
  select site_id from user_profiles where id = auth.uid()
$$;

create or replace function current_user_role()
returns text language sql stable as $$
  select role from user_profiles where id = auth.uid()
$$;

-- EXPENSES: members see all site expenses (but not other sites)
create policy "site members read expenses"
on expenses for select
using (site_id = current_user_site_id() and voided_at is null);

-- EXPENSES: members can insert
create policy "members insert expenses"
on expenses for insert
with check (site_id = current_user_site_id());

-- EXPENSES: only owner/admin can void (update voided_at)
create policy "owner admin void expenses"
on expenses for update
using (
  site_id = current_user_site_id() and
  current_user_role() in ('owner', 'admin')
);

-- AUDIT LOG: owner + admin read only their site's log
create policy "owner admin read audit"
on audit_log for select
using (
  current_user_role() in ('owner', 'admin') and
  entity_id in (select id from expenses where site_id = current_user_site_id())
);

-- AUDIT LOG: insert allowed for all authenticated users (via trigger)
create policy "authenticated insert audit"
on audit_log for insert
with check (auth.uid() is not null);
```

---

## Indexes

```sql
-- Expenses — most common query patterns
create index on expenses (site_id, date desc);
create index on expenses (site_id, status);
create index on expenses (vendor_id);
create index on expenses (category_id);
create index on expenses (created_by);

-- Payments
create index on payments (expense_id);
create index on payments (paid_by);

-- Audit log
create index on audit_log (entity, entity_id);
create index on audit_log (actor_id, created_at desc);

-- Vendors
create index on vendors (site_id);

-- Subcategories
create index on subcategories (site_id, category_id);
```

---

## Supabase Storage

One bucket: `attachments`

```
Settings:
- Public: NO (private bucket)
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
```

File path convention: `{site_id}/{expense_id}/{uuid}.{ext}`

Files are never served directly. Always via a signed URL with 1-hour expiry:
```typescript
const { data } = await supabase.storage
  .from('attachments')
  .createSignedUrl(file_url, 3600) // 1 hour
```

---

## Useful views (for operator panel)

```sql
-- Expense summary by category, month
create view v_monthly_category_summary as
select
  site_id,
  date_trunc('month', date) as month,
  category_id,
  count(*) as count,
  sum(amount) as total_amount,
  sum(case when status = 'paid' then amount else 0 end) as paid_amount,
  sum(case when status != 'paid' then amount else 0 end) as outstanding_amount
from expenses
where voided_at is null
group by site_id, date_trunc('month', date), category_id;

-- Vendor totals
create view v_vendor_totals as
select
  e.vendor_id,
  v.name as vendor_name,
  v.site_id,
  count(*) as transaction_count,
  sum(e.amount) as total_billed,
  sum(case when e.status = 'paid' then e.amount else 0 end) as total_paid,
  sum(case when e.status != 'paid' then e.amount else 0 end) as outstanding
from expenses e
join vendors v on v.id = e.vendor_id
where e.voided_at is null and e.vendor_id is not null
group by e.vendor_id, v.name, v.site_id;
```
