-- ============================================================================
-- SiteKhata — helper functions and triggers
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- AUTH HELPERS
--
-- security definer is required: these read user_profiles / user_sites, which
-- are themselves RLS-protected. Without it, every policy that calls them would
-- recurse into the policy on the table being read.
-- search_path is pinned — a security definer function with a mutable
-- search_path is a privilege-escalation hole.
-- ─────────────────────────────────────────────────────────────

-- The site the current user is looking at right now.
create or replace function current_user_site_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_site_id
  from user_profiles
  where id = auth.uid() and active = true
$$;

-- The current user's role ON THEIR ACTIVE SITE.
create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select us.role
  from user_sites us
  join user_profiles up
    on up.id = us.user_id
   and up.active_site_id = us.site_id
  where us.user_id = auth.uid()
    and up.active = true
$$;

-- Does the current user belong to this site at all? (drives the site switcher)
create or replace function user_belongs_to_site(target_site uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_sites us
    join user_profiles up on up.id = us.user_id
    where us.user_id = auth.uid()
      and us.site_id = target_site
      and up.active = true
  )
$$;

-- Convenience: current user holds one of these roles on their active site.
create or replace function current_user_has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role() = any(roles)
$$;


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 1 — keep expenses.updated_at honest
-- (the column existed in DATABASE.md but nothing maintained it)
-- ─────────────────────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger expenses_touch_updated_at
before update on expenses
for each row execute function touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 2 — recompute expense status from its payments
--
-- Fix vs DATABASE.md: returns coalesce(NEW, OLD). NEW is NULL on DELETE, so
-- the original `return NEW` returned NULL on the delete path.
-- Voided payments do not count toward the total.
-- ─────────────────────────────────────────────────────────────
create or replace function recompute_expense_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id     uuid := coalesce(NEW.expense_id, OLD.expense_id);
  v_expense_amount numeric(12, 2);
  v_total_paid     numeric(12, 2);
begin
  select amount into v_expense_amount
  from expenses
  where id = v_expense_id;

  -- the expense row is gone (cascade delete) — nothing to update
  if v_expense_amount is null then
    return coalesce(NEW, OLD);
  end if;

  select coalesce(sum(amount), 0) into v_total_paid
  from payments
  where expense_id = v_expense_id
    and voided_at is null;

  update expenses
  set status = case
        when v_total_paid <= 0                then 'unpaid'
        when v_total_paid >= v_expense_amount then 'paid'
        else                                       'partial'
      end
  where id = v_expense_id;

  return coalesce(NEW, OLD);
end;
$$;

create trigger payments_recompute_status
after insert or update or delete on payments
for each row execute function recompute_expense_status();

-- If the expense amount itself is edited, the status must be recomputed too.
create or replace function recompute_status_on_amount_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_paid numeric(12, 2);
begin
  select coalesce(sum(amount), 0) into v_total_paid
  from payments
  where expense_id = NEW.id and voided_at is null;

  NEW.status := case
    when v_total_paid <= 0          then 'unpaid'
    when v_total_paid >= NEW.amount then 'paid'
    else                                 'partial'
  end;

  return NEW;
end;
$$;

create trigger expenses_recompute_status_on_amount
before update of amount on expenses
for each row
when (OLD.amount is distinct from NEW.amount)
execute function recompute_status_on_amount_change();


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 3 — audit log
--
-- Fires unconditionally on every write. App code cannot skip it, and a new
-- code path cannot forget it. This is the one thing that must be correct.
-- ─────────────────────────────────────────────────────────────
create or replace function write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new     jsonb := to_jsonb(NEW);
  v_old     jsonb := to_jsonb(OLD);
  v_rec     jsonb := coalesce(v_new, v_old);
  v_site_id uuid;
  v_action  text;
begin
  -- ── resolve the site this row belongs to ────────────────────
  if v_rec ? 'site_id' then
    v_site_id := (v_rec->>'site_id')::uuid;

  elsif TG_TABLE_NAME = 'payments' then
    select e.site_id into v_site_id
    from expenses e
    where e.id = (v_rec->>'expense_id')::uuid;

  elsif TG_TABLE_NAME = 'attachments' then
    if v_rec->>'expense_id' is not null then
      select e.site_id into v_site_id
      from expenses e where e.id = (v_rec->>'expense_id')::uuid;
    else
      select e.site_id into v_site_id
      from payments p join expenses e on e.id = p.expense_id
      where p.id = (v_rec->>'payment_id')::uuid;
    end if;
  end if;

  -- ── resolve a human-meaningful action name ──────────────────
  v_action := case
    when TG_OP = 'DELETE' then 'deleted'
    when TG_OP = 'INSERT' and TG_TABLE_NAME = 'payments' then 'payment_recorded'
    when TG_OP = 'INSERT' then 'created'
    when TG_OP = 'UPDATE'
         and v_old->>'voided_at' is null
         and v_new->>'voided_at' is not null then 'voided'
    when TG_OP = 'UPDATE'
         and v_old->>'voided_at' is not null
         and v_new->>'voided_at' is null then 'restored'
    else 'updated'
  end;

  insert into audit_log (
    site_id, actor_id, action, entity, entity_id, before_json, after_json
  )
  values (
    v_site_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    (v_rec->>'id')::uuid,
    case when TG_OP in ('UPDATE', 'DELETE') then v_old end,
    case when TG_OP in ('INSERT', 'UPDATE') then v_new end
  );

  return coalesce(NEW, OLD);
end;
$$;

create trigger audit_expenses
after insert or update or delete on expenses
for each row execute function write_audit_log();

create trigger audit_payments
after insert or update or delete on payments
for each row execute function write_audit_log();

create trigger audit_vendors
after insert or update or delete on vendors
for each row execute function write_audit_log();

create trigger audit_subcategories
after insert or update or delete on subcategories
for each row execute function write_audit_log();

create trigger audit_budgets
after insert or update or delete on budgets
for each row execute function write_audit_log();

create trigger audit_attachments
after insert or update or delete on attachments
for each row execute function write_audit_log();


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 4 — the audit log is append-only, forever
-- Applies to the service role too. Deliberate: there is no legitimate reason
-- to edit this table, and a ledger with holes in it is untrustworthy.
-- ─────────────────────────────────────────────────────────────
create or replace function block_audit_modification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_log is append-only; % is not permitted', TG_OP;
end;
$$;

create trigger protect_audit_log
before update or delete on audit_log
for each row execute function block_audit_modification();


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 5 — new auth user gets a profile automatically
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_profiles (id, name, phone)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'name', NEW.email, NEW.phone, 'New user'),
    NEW.phone
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_auth_user();
