-- ============================================================================
-- GOK-NET — in-app notifications
--
-- One row per recipient. Generation happens two ways:
--   1. Trigger-driven (this file): expense/payment inserts happen via direct
--      client RLS writes, not a server route, so a security definer trigger
--      is the only place that can't be skipped — same reasoning as
--      write_audit_log() in 20260821080100_functions_triggers.sql.
--   2. Cron-driven (app/api/cron/notifications/route.ts, service role): due-
--      date reminders are time-based, not write-based, so they can't be a
--      trigger. That same route also purges rows older than 30 days — the
--      actual retention mechanism, not just a query filter.
-- ============================================================================

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  user_id     uuid not null references user_profiles(id) on delete cascade,
  type        text not null check (type in ('expense_created', 'payment_recorded', 'payment_due')),
  title       text not null,
  body        text,
  entity      text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read_at, created_at desc);
create index notifications_site_idx on notifications (site_id);

alter table notifications enable row level security;

-- Only ever read/marked-read by the recipient. No insert/delete grant at
-- all — rows are written by the security definer triggers below or by the
-- service role (cron), matching how `payments` locks out client inserts.
revoke all on notifications from anon, authenticated;
grant select, update (read_at) on notifications to authenticated;

create policy "read own notifications"
on notifications for select to authenticated
using (user_id = auth.uid());

create policy "mark own notifications read"
on notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- New expense → notify every other active member of the site.
-- ─────────────────────────────────────────────────────────────
create or replace function notify_new_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (site_id, user_id, type, title, body, entity, entity_id)
  select
    NEW.site_id,
    us.user_id,
    'expense_created',
    'New expense recorded',
    coalesce((select name from user_profiles where id = NEW.created_by), 'A member')
      || ' recorded ' || NEW.description || ' — ₹' || trim(to_char(NEW.amount, '999,999,999')),
    'expenses',
    NEW.id
  from user_sites us
  join user_profiles up on up.id = us.user_id
  where us.site_id = NEW.site_id
    and us.user_id <> NEW.created_by
    and up.active = true;
  return NEW;
end;
$$;

create trigger expenses_notify_new
after insert on expenses
for each row execute function notify_new_expense();


-- ─────────────────────────────────────────────────────────────
-- Payment recorded → notify every other active member of the site.
-- Resolves site_id via the expense, same as write_audit_log() does for
-- the payments table.
-- ─────────────────────────────────────────────────────────────
create or replace function notify_payment_recorded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id     uuid;
  v_description text;
begin
  select e.site_id, e.description into v_site_id, v_description
  from expenses e
  where e.id = NEW.expense_id;

  if v_site_id is null then
    return NEW;
  end if;

  insert into notifications (site_id, user_id, type, title, body, entity, entity_id)
  select
    v_site_id,
    us.user_id,
    'payment_recorded',
    'Payment recorded',
    '₹' || trim(to_char(NEW.amount, '999,999,999')) || ' recorded against ' || v_description,
    'expenses',
    NEW.expense_id
  from user_sites us
  join user_profiles up on up.id = us.user_id
  where us.site_id = v_site_id
    and us.user_id <> NEW.created_by
    and up.active = true;
  return NEW;
end;
$$;

create trigger payments_notify_recorded
after insert on payments
for each row execute function notify_payment_recorded();

revoke execute on function notify_new_expense() from public, anon, authenticated;
revoke execute on function notify_payment_recorded() from public, anon, authenticated;
