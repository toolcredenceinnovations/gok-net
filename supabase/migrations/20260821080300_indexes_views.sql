-- ============================================================================
-- GOK-NET — indexes and reporting views
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- INDEXES — driven by the actual query patterns in the app
-- ─────────────────────────────────────────────────────────────

-- month dashboard + "all entries" default sort
create index expenses_site_date_idx      on expenses (site_id, date desc);
-- paid / unpaid / partial tabs
create index expenses_site_status_idx    on expenses (site_id, status);
-- vendor detail page
create index expenses_vendor_idx         on expenses (vendor_id) where vendor_id is not null;
create index expenses_category_idx       on expenses (category_id);
create index expenses_subcategory_idx    on expenses (subcategory_id) where subcategory_id is not null;
create index expenses_created_by_idx     on expenses (created_by);
-- operator panel: "voided within 24h of creation", void filters
create index expenses_voided_idx         on expenses (site_id, voided_at) where voided_at is not null;
-- operator panel: overdue challans
create index expenses_due_date_idx       on expenses (site_id, due_date) where due_date is not null;
-- vendor + amount + date duplicate detection
create index expenses_dupe_check_idx     on expenses (site_id, vendor_id, date, amount);
-- description search
create index expenses_description_trgm_idx on expenses using gin (description extensions.gin_trgm_ops);

create index payments_expense_idx        on payments (expense_id);
create index payments_paid_by_idx        on payments (paid_by);       -- settlement view
create index payments_paid_on_idx        on payments (paid_on desc);
create index payments_cheque_status_idx  on payments (cheque_status) where mode = 'cheque';

create index attachments_expense_idx     on attachments (expense_id) where expense_id is not null;
create index attachments_payment_idx     on attachments (payment_id) where payment_id is not null;

create index audit_log_site_created_idx  on audit_log (site_id, created_at desc);
create index audit_log_entity_idx        on audit_log (entity, entity_id);
create index audit_log_actor_idx         on audit_log (actor_id, created_at desc);
create index audit_log_action_idx        on audit_log (site_id, action, created_at desc);

create index vendors_site_idx            on vendors (site_id);
create index vendors_name_trgm_idx       on vendors using gin (name extensions.gin_trgm_ops);  -- vendor search

create index subcategories_site_cat_idx  on subcategories (site_id, category_id);
create index user_sites_site_idx         on user_sites (site_id);
create index budgets_site_period_idx     on budgets (site_id, period);
create index user_profiles_active_site_idx on user_profiles (active_site_id);


-- ─────────────────────────────────────────────────────────────
-- VIEWS
--
-- security_invoker = on is essential. Without it a view runs with the
-- privileges of its owner, which would hand every caller the whole table and
-- silently defeat RLS. Postgres 15+ only.
-- All views exclude voided rows — that is where void filtering belongs, not
-- in the security policy.
-- ─────────────────────────────────────────────────────────────

-- Expense with its payment totals resolved. The workhorse for lists and detail.
create view v_expense_totals
with (security_invoker = on) as
select
  e.*,
  coalesce(p.total_paid, 0)              as total_paid,
  e.amount - coalesce(p.total_paid, 0)   as outstanding,
  coalesce(p.payment_count, 0)           as payment_count,
  p.last_paid_on
from expenses e
left join lateral (
  select sum(amount)   as total_paid,
         count(*)      as payment_count,
         max(paid_on)  as last_paid_on
  from payments
  where expense_id = e.id and voided_at is null
) p on true
where e.voided_at is null;

-- Month dashboard: spend by category.
create view v_monthly_category_summary
with (security_invoker = on) as
select
  e.site_id,
  date_trunc('month', e.date)::date as month,
  e.category_id,
  c.name                            as category_name,
  count(*)                          as entry_count,
  sum(e.amount)                     as total_amount,
  sum(coalesce(p.total_paid, 0))    as paid_amount,
  sum(e.amount - coalesce(p.total_paid, 0)) as outstanding_amount
from expenses e
join categories c on c.id = e.category_id
left join lateral (
  select sum(amount) as total_paid
  from payments where expense_id = e.id and voided_at is null
) p on true
where e.voided_at is null
group by e.site_id, date_trunc('month', e.date), e.category_id, c.name;

-- Vendor page: "how much did I pay ABC Traders this year?" in one query.
create view v_vendor_totals
with (security_invoker = on) as
select
  v.id          as vendor_id,
  v.site_id,
  v.name        as vendor_name,
  v.phone,
  v.archived_at,
  count(e.id)                                as transaction_count,
  coalesce(sum(e.amount), 0)                 as total_billed,
  coalesce(sum(p.total_paid), 0)             as total_paid,
  coalesce(sum(e.amount - coalesce(p.total_paid, 0)), 0) as outstanding,
  max(e.date)                                as last_transaction_date
from vendors v
left join expenses e on e.vendor_id = v.id and e.voided_at is null
left join lateral (
  select sum(amount) as total_paid
  from payments where expense_id = e.id and voided_at is null
) p on true
group by v.id, v.site_id, v.name, v.phone, v.archived_at;

-- P1 settlement: who has put in money from their own pocket.
create view v_settlement_by_user
with (security_invoker = on) as
select
  e.site_id,
  p.paid_by                as user_id,
  up.name                  as user_name,
  p.mode,
  count(*)                 as payment_count,
  sum(p.amount)            as total_paid_in
from payments p
join expenses e     on e.id = p.expense_id
join user_profiles up on up.id = p.paid_by
where p.voided_at is null and e.voided_at is null
group by e.site_id, p.paid_by, up.name, p.mode;

-- P1 vendor aging: turns "unpaid" into a collections list.
create view v_vendor_aging
with (security_invoker = on) as
select
  e.site_id,
  e.vendor_id,
  v.name as vendor_name,
  e.id   as expense_id,
  e.description,
  e.due_date,
  e.amount - coalesce(p.total_paid, 0) as outstanding,
  greatest(0, (current_date - coalesce(e.due_date, e.date))) as days_overdue,
  case
    when (current_date - coalesce(e.due_date, e.date)) <= 30 then '0-30'
    when (current_date - coalesce(e.due_date, e.date)) <= 60 then '31-60'
    when (current_date - coalesce(e.due_date, e.date)) <= 90 then '61-90'
    else '90+'
  end as aging_bucket
from expenses e
left join vendors v on v.id = e.vendor_id
left join lateral (
  select sum(amount) as total_paid
  from payments where expense_id = e.id and voided_at is null
) p on true
where e.voided_at is null
  and e.status <> 'paid';

grant select on v_expense_totals,
                v_monthly_category_summary,
                v_vendor_totals,
                v_settlement_by_user,
                v_vendor_aging
  to authenticated;
