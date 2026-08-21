-- ============================================================================
-- SiteKhata — initial schema
--
-- Differs from docs/DATABASE.md in three deliberate ways (see the plan, §3.3):
--   1. Roles live on `user_sites`, not `user_profiles` — a user can hold a
--      different role on each site, and the Owner needs a site switcher.
--   2. `audit_log` carries `site_id` and a nullable `entity_id`, so login and
--      pin events can be logged and the audit portal can filter by site.
--   3. Void state is NOT hidden at the schema level — see the RLS migration.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────────────────────────
create table sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  slug        text unique not null,
  plan        text not null default 'basic' check (plan in ('basic', 'pro')),
  -- feature flags, currency, date format, and the bcrypt PIN hash.
  -- never selected directly by the client — see the sites RLS policy.
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- USER PROFILES
-- Supabase Auth owns credentials; this holds app-level profile.
-- Role is NOT here — it is per-site, on user_sites.
-- ─────────────────────────────────────────────────────────────
create table user_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null,
  phone          text,
  active         boolean not null default true,
  -- which site this user is currently looking at; drives current_user_site_id()
  active_site_id uuid references sites(id),
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- USER ↔ SITE MEMBERSHIP (carries the role)
-- ─────────────────────────────────────────────────────────────
create table user_sites (
  user_id    uuid not null references user_profiles(id) on delete cascade,
  site_id    uuid not null references sites(id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES — the fixed four, global (not site-scoped)
-- ─────────────────────────────────────────────────────────────
create table categories (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  is_system boolean not null default true,
  sort_order smallint not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- SUBCATEGORIES — owner-managed, per site, archived never deleted
-- ─────────────────────────────────────────────────────────────
create table subcategories (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  category_id uuid not null references categories(id),
  name        text not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (site_id, category_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- VENDORS
-- ─────────────────────────────────────────────────────────────
create table vendors (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  name        text not null,
  phone       text,
  gstin       text,
  notes       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────────
create table expenses (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites(id) on delete cascade,
  date           date not null,
  description    text not null,
  amount         numeric(12, 2) not null check (amount > 0),
  category_id    uuid not null references categories(id),
  subcategory_id uuid references subcategories(id),
  vendor_id      uuid references vendors(id),
  challan_no     text,
  due_date       date,

  -- derived from payments by trigger; a cache, not the source of truth
  status         text not null default 'unpaid'
                 check (status in ('unpaid', 'partial', 'paid')),

  created_by     uuid not null references user_profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- void, never delete
  voided_at      timestamptz,
  voided_by      uuid references user_profiles(id),
  void_reason    text,

  -- a void must always carry a reason and an actor
  constraint void_is_complete check (
    (voided_at is null  and voided_by is null and void_reason is null)
    or
    (voided_at is not null and voided_by is not null and void_reason is not null
     and length(btrim(void_reason)) > 0)
  )
);

-- ─────────────────────────────────────────────────────────────
-- PAYMENTS — money actually moving. 0..n per expense.
-- ─────────────────────────────────────────────────────────────
create table payments (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references expenses(id) on delete cascade,
  amount        numeric(12, 2) not null check (amount > 0),
  mode          text not null check (mode in ('cash', 'cheque', 'voucher')),
  -- who actually put the money in; drives the P1 settlement view
  paid_by       uuid not null references user_profiles(id),
  paid_on       date not null,
  remark        text,

  cheque_no     text,
  cheque_bank   text,
  cheque_status text check (cheque_status in ('issued', 'cleared', 'bounced')),

  created_by    uuid not null references user_profiles(id),
  created_at    timestamptz not null default now(),

  voided_at     timestamptz,
  voided_by     uuid references user_profiles(id),
  void_reason   text,

  -- cheque fields belong to cheques only
  constraint cheque_fields_consistent check (
    mode = 'cheque'
    or (cheque_no is null and cheque_bank is null and cheque_status is null)
  ),
  constraint cheque_has_status check (
    mode <> 'cheque' or cheque_status is not null
  )
);

-- ─────────────────────────────────────────────────────────────
-- ATTACHMENTS — invoice / challan, in private storage
-- ─────────────────────────────────────────────────────────────
create table attachments (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid references expenses(id) on delete cascade,
  payment_id  uuid references payments(id) on delete cascade,
  type        text not null check (type in ('invoice', 'challan', 'other')),
  -- storage path, NOT a URL. served via short-lived signed URLs only.
  --   {site_id}/expenses/{expense_id}/{uuid}.{ext}
  --   {site_id}/payments/{payment_id}/{uuid}.{ext}
  file_path   text not null,
  mime_type   text,
  size_bytes  integer,
  uploaded_by uuid not null references user_profiles(id),
  uploaded_at timestamptz not null default now(),

  constraint one_parent check (
    (expense_id is not null and payment_id is null) or
    (expense_id is null and payment_id is not null)
  )
);

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOG — insert-only, written by trigger, never by app code
-- ─────────────────────────────────────────────────────────────
create table audit_log (
  id          bigserial primary key,
  -- site scoping: without this the audit portal can only ever see expenses
  site_id     uuid references sites(id) on delete set null,
  actor_id    uuid references user_profiles(id),
  action      text not null,   -- created|updated|voided|restored|payment_recorded|
                               -- deleted|pin_used|pin_failed|login
  entity      text not null,   -- expenses|payments|vendors|subcategories|
                               -- user_sites|sites|auth
  -- nullable: login and pin_used have no entity row
  entity_id   uuid,
  before_json jsonb,
  after_json  jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- BUDGETS (P1, schema present from day one)
-- ─────────────────────────────────────────────────────────────
create table budgets (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites(id) on delete cascade,
  category_id    uuid not null references categories(id),
  subcategory_id uuid references subcategories(id),
  period         text not null,   -- '2026-01' | '2026-Q1' | '2026'
  amount         numeric(12, 2) not null check (amount > 0),
  created_by     uuid not null references user_profiles(id),
  created_at     timestamptz not null default now(),
  unique (site_id, category_id, subcategory_id, period)
);
