-- ============================================================================
-- SiteKhata — Row Level Security
--
-- docs/DATABASE.md enables RLS on nine tables but writes policies for two.
-- Enabled + no policy = deny all, so this migration is what makes the app
-- function at all. Every table below is deny-by-default; access is granted
-- explicitly and only ever scoped to the caller's ACTIVE site.
--
-- Two things are deliberately NOT grantable to `authenticated`, because they
-- must go through the PIN-gated Edge Function (plan decision D):
--   • inserting a payment
--   • setting voided_at / voided_by / void_reason / status on an expense
-- Both are enforced below — the first by the absence of an insert policy, the
-- second by column-level grants. RLS is the lock; the UI is a convenience.
-- ============================================================================

alter table sites          enable row level security;
alter table user_profiles  enable row level security;
alter table user_sites     enable row level security;
alter table categories     enable row level security;
alter table subcategories  enable row level security;
alter table vendors        enable row level security;
alter table expenses       enable row level security;
alter table payments       enable row level security;
alter table attachments    enable row level security;
alter table audit_log      enable row level security;
alter table budgets        enable row level security;


-- ─────────────────────────────────────────────────────────────
-- SITES
-- The settings column holds the PIN hash. Column-level grants keep it out of
-- reach of `authenticated` entirely — even `select *` cannot return it.
-- ─────────────────────────────────────────────────────────────
revoke all on sites from anon, authenticated;
grant select (id, name, address, slug, plan, created_at, archived_at)
  on sites to authenticated;
grant update (name, address) on sites to authenticated;

create policy "members read their sites"
on sites for select to authenticated
using (user_belongs_to_site(id));

create policy "owner updates site"
on sites for update to authenticated
using (user_belongs_to_site(id) and current_user_role() = 'owner')
with check (user_belongs_to_site(id) and current_user_role() = 'owner');


-- ─────────────────────────────────────────────────────────────
-- USER PROFILES
-- You can always see yourself. You can see anyone who shares your active site
-- (needed to render "who paid" and "created by").
-- ─────────────────────────────────────────────────────────────
revoke all on user_profiles from anon, authenticated;
grant select on user_profiles to authenticated;
grant update (name, phone, active_site_id) on user_profiles to authenticated;

create policy "read own profile"
on user_profiles for select to authenticated
using (id = auth.uid());

create policy "read profiles on shared site"
on user_profiles for select to authenticated
using (
  exists (
    select 1 from user_sites us
    where us.user_id = user_profiles.id
      and us.site_id = current_user_site_id()
  )
);

-- Users switch sites by updating active_site_id. The check constrains them to
-- sites they actually belong to.
create policy "update own profile"
on user_profiles for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and (active_site_id is null or user_belongs_to_site(active_site_id))
);

create policy "owner updates site members"
on user_profiles for update to authenticated
using (
  current_user_role() = 'owner'
  and exists (
    select 1 from user_sites us
    where us.user_id = user_profiles.id
      and us.site_id = current_user_site_id()
  )
);


-- ─────────────────────────────────────────────────────────────
-- USER ↔ SITE MEMBERSHIP
-- Read your own memberships (the site switcher needs this). Owners manage
-- membership for their active site.
-- ─────────────────────────────────────────────────────────────
revoke all on user_sites from anon, authenticated;
grant select, insert, update, delete on user_sites to authenticated;

create policy "read own memberships"
on user_sites for select to authenticated
using (user_id = auth.uid());

create policy "owner admin read site roster"
on user_sites for select to authenticated
using (
  site_id = current_user_site_id()
  and current_user_has_role('owner', 'admin')
);

create policy "owner manages memberships"
on user_sites for insert to authenticated
with check (site_id = current_user_site_id() and current_user_role() = 'owner');

create policy "owner updates memberships"
on user_sites for update to authenticated
using (site_id = current_user_site_id() and current_user_role() = 'owner')
with check (site_id = current_user_site_id() and current_user_role() = 'owner');

create policy "owner removes memberships"
on user_sites for delete to authenticated
using (
  site_id = current_user_site_id()
  and current_user_role() = 'owner'
  and user_id <> auth.uid()   -- an owner cannot lock themselves out
);


-- ─────────────────────────────────────────────────────────────
-- CATEGORIES — global read-only reference data
-- ─────────────────────────────────────────────────────────────
revoke all on categories from anon, authenticated;
grant select on categories to authenticated;

create policy "authenticated read categories"
on categories for select to authenticated
using (true);


-- ─────────────────────────────────────────────────────────────
-- SUBCATEGORIES — owner-managed, archived never deleted
-- ─────────────────────────────────────────────────────────────
revoke all on subcategories from anon, authenticated;
grant select, insert on subcategories to authenticated;
grant update (name, archived_at) on subcategories to authenticated;

create policy "site members read subcategories"
on subcategories for select to authenticated
using (site_id = current_user_site_id());

create policy "owner creates subcategories"
on subcategories for insert to authenticated
with check (site_id = current_user_site_id() and current_user_role() = 'owner');

create policy "owner updates subcategories"
on subcategories for update to authenticated
using (site_id = current_user_site_id() and current_user_role() = 'owner')
with check (site_id = current_user_site_id() and current_user_role() = 'owner');


-- ─────────────────────────────────────────────────────────────
-- VENDORS — members create on the fly while adding an expense
-- ─────────────────────────────────────────────────────────────
revoke all on vendors from anon, authenticated;
grant select, insert on vendors to authenticated;
grant update (name, phone, gstin, notes, archived_at) on vendors to authenticated;

create policy "site members read vendors"
on vendors for select to authenticated
using (site_id = current_user_site_id());

create policy "members create vendors"
on vendors for insert to authenticated
with check (
  site_id = current_user_site_id()
  and current_user_has_role('owner', 'admin', 'member')
);

create policy "owner admin update vendors"
on vendors for update to authenticated
using (site_id = current_user_site_id() and current_user_has_role('owner', 'admin'))
with check (site_id = current_user_site_id() and current_user_has_role('owner', 'admin'));


-- ─────────────────────────────────────────────────────────────
-- EXPENSES
--
-- Note what is NOT in the select policy: `and voided_at is null`.
-- DATABASE.md had it, which made voided entries invisible to everyone and
-- made "Owner can restore" impossible. Voided rows are filtered out in the
-- views and queries instead — visibility is a product concern, not a
-- security one.
--
-- The update grant deliberately omits voided_at / voided_by / void_reason /
-- status / site_id / created_by. Voiding therefore CANNOT happen over the
-- REST API with a user token, only through the PIN Edge Function's service
-- role. status is trigger-owned.
-- ─────────────────────────────────────────────────────────────
revoke all on expenses from anon, authenticated;
grant select, insert on expenses to authenticated;
grant update (date, description, amount, category_id, subcategory_id,
              vendor_id, challan_no, due_date, updated_at)
  on expenses to authenticated;

create policy "site members read expenses"
on expenses for select to authenticated
using (site_id = current_user_site_id());

create policy "members create expenses"
on expenses for insert to authenticated
with check (
  site_id = current_user_site_id()
  and created_by = auth.uid()
  and current_user_has_role('owner', 'admin', 'member')
);

create policy "owner admin edit expenses"
on expenses for update to authenticated
using (
  site_id = current_user_site_id()
  and voided_at is null                       -- a voided entry is frozen
  and current_user_has_role('owner', 'admin')
)
with check (site_id = current_user_site_id());


-- ─────────────────────────────────────────────────────────────
-- PAYMENTS — read-only over the API, by design
--
-- There is NO insert or update policy and no insert grant. Recording a
-- payment and voiding a payment both happen inside the PIN-gated Edge
-- Function using the service role, which bypasses RLS. This is what makes
-- the PIN a real lock rather than a UI speed bump.
-- ─────────────────────────────────────────────────────────────
revoke all on payments from anon, authenticated;
grant select on payments to authenticated;

create policy "site members read payments"
on payments for select to authenticated
using (
  exists (
    select 1 from expenses e
    where e.id = payments.expense_id
      and e.site_id = current_user_site_id()
  )
);


-- ─────────────────────────────────────────────────────────────
-- ATTACHMENTS
-- ─────────────────────────────────────────────────────────────
revoke all on attachments from anon, authenticated;
grant select, insert on attachments to authenticated;

create policy "site members read attachments"
on attachments for select to authenticated
using (
  (expense_id is not null and exists (
    select 1 from expenses e
    where e.id = attachments.expense_id and e.site_id = current_user_site_id()
  ))
  or
  (payment_id is not null and exists (
    select 1 from payments p
    join expenses e on e.id = p.expense_id
    where p.id = attachments.payment_id and e.site_id = current_user_site_id()
  ))
);

create policy "members upload attachments"
on attachments for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and current_user_has_role('owner', 'admin', 'member')
  and (
    (expense_id is not null and exists (
      select 1 from expenses e
      where e.id = attachments.expense_id
        and e.site_id = current_user_site_id()
        and e.voided_at is null
    ))
    or
    (payment_id is not null and exists (
      select 1 from payments p
      join expenses e on e.id = p.expense_id
      where p.id = attachments.payment_id and e.site_id = current_user_site_id()
    ))
  )
);


-- ─────────────────────────────────────────────────────────────
-- AUDIT LOG
-- Read: owner + admin, their site only. Now works for every entity type,
-- not just expenses, because audit_log carries site_id.
-- Write: nobody. The trigger is security definer and bypasses RLS; there is
-- deliberately no insert policy, so no client can forge an entry.
-- ─────────────────────────────────────────────────────────────
revoke all on audit_log from anon, authenticated;
grant select on audit_log to authenticated;

create policy "owner admin read site audit log"
on audit_log for select to authenticated
using (
  site_id = current_user_site_id()
  and current_user_has_role('owner', 'admin')
);


-- ─────────────────────────────────────────────────────────────
-- BUDGETS (P1)
-- ─────────────────────────────────────────────────────────────
revoke all on budgets from anon, authenticated;
grant select, insert on budgets to authenticated;
grant update (amount) on budgets to authenticated;

create policy "site members read budgets"
on budgets for select to authenticated
using (site_id = current_user_site_id());

create policy "owner manages budgets"
on budgets for insert to authenticated
with check (
  site_id = current_user_site_id()
  and current_user_role() = 'owner'
  and created_by = auth.uid()
);

create policy "owner updates budgets"
on budgets for update to authenticated
using (site_id = current_user_site_id() and current_user_role() = 'owner')
with check (site_id = current_user_site_id() and current_user_role() = 'owner');


-- ─────────────────────────────────────────────────────────────
-- Sequences: audit_log.id is a bigserial but nothing may insert directly.
-- ─────────────────────────────────────────────────────────────
revoke all on sequence audit_log_id_seq from anon, authenticated;
