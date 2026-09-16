-- ─────────────────────────────────────────────────────────────
-- VENDORS — remember the category/subcategory picked when a vendor
-- is created on the fly from the expense form, so the Vendors page
-- can filter by category without joining through expense history.
-- ─────────────────────────────────────────────────────────────
alter table vendors
  add column category_id    uuid references categories(id),
  add column subcategory_id uuid references subcategories(id);

grant update (name, phone, gstin, notes, archived_at, category_id, subcategory_id) on vendors to authenticated;

drop view v_vendor_totals;

create view v_vendor_totals
with (security_invoker = on) as
select
  v.id             as vendor_id,
  v.site_id,
  v.name           as vendor_name,
  v.phone,
  v.archived_at,
  v.category_id,
  c.name           as category_name,
  v.subcategory_id,
  sc.name          as subcategory_name,
  count(e.id)                                as transaction_count,
  coalesce(sum(e.amount), 0)                 as total_billed,
  coalesce(sum(p.total_paid), 0)             as total_paid,
  coalesce(sum(e.amount - coalesce(p.total_paid, 0)), 0) as outstanding,
  max(e.date)                                as last_transaction_date
from vendors v
left join categories c on c.id = v.category_id
left join subcategories sc on sc.id = v.subcategory_id
left join expenses e on e.vendor_id = v.id and e.voided_at is null
left join lateral (
  select sum(amount) as total_paid
  from payments where expense_id = e.id and voided_at is null
) p on true
group by v.id, v.site_id, v.name, v.phone, v.archived_at, v.category_id, c.name, v.subcategory_id, sc.name;

grant select on v_vendor_totals to authenticated;
