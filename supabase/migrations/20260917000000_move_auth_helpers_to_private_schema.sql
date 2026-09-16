-- Move the auth-helper functions out of `public` into a non-exposed
-- `private` schema. They must stay SECURITY DEFINER and remain callable
-- by `authenticated` (RLS policies invoke them as the querying role), but
-- PostgREST only auto-exposes functions in schemas on its exposed-schema
-- list (public/graphql_public by default) — moving them to `private`
-- removes the accidental /rest/v1/rpc/<fn> endpoints the linter flagged,
-- without touching how RLS policies use them.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_site_id()
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

create or replace function private.current_user_role()
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

create or replace function private.user_belongs_to_site(target_site uuid)
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

create or replace function private.current_user_has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_user_role() = any(roles)
$$;

grant execute on function private.current_user_site_id() to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.user_belongs_to_site(uuid) to authenticated, service_role;
grant execute on function private.current_user_has_role(variadic text[]) to authenticated, service_role;

-- attachments
alter policy "members upload attachments" on attachments
  with check (
    (uploaded_by = auth.uid())
    and private.current_user_has_role(variadic array['owner','admin','member'])
    and (
      (expense_id is not null and exists (
        select 1 from expenses e
        where e.id = attachments.expense_id
          and e.site_id = private.current_user_site_id()
          and e.voided_at is null
      ))
      or
      (payment_id is not null and exists (
        select 1 from payments p join expenses e on e.id = p.expense_id
        where p.id = attachments.payment_id
          and e.site_id = private.current_user_site_id()
      ))
    )
  );

alter policy "site members read attachments" on attachments
  using (
    (expense_id is not null and exists (
      select 1 from expenses e
      where e.id = attachments.expense_id and e.site_id = private.current_user_site_id()
    ))
    or
    (payment_id is not null and exists (
      select 1 from payments p join expenses e on e.id = p.expense_id
      where p.id = attachments.payment_id and e.site_id = private.current_user_site_id()
    ))
  );

-- audit_log
alter policy "owner admin read site audit log" on audit_log
  using (
    site_id = private.current_user_site_id()
    and private.current_user_has_role(variadic array['owner','admin'])
  );

-- budgets
alter policy "owner manages budgets" on budgets
  with check (
    site_id = private.current_user_site_id()
    and private.current_user_role() = 'owner'
    and created_by = auth.uid()
  );

alter policy "owner updates budgets" on budgets
  using (site_id = private.current_user_site_id() and private.current_user_role() = 'owner')
  with check (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

alter policy "site members read budgets" on budgets
  using (site_id = private.current_user_site_id());

-- expenses
alter policy "members create expenses" on expenses
  with check (
    site_id = private.current_user_site_id()
    and created_by = auth.uid()
    and private.current_user_has_role(variadic array['owner','admin','member'])
  );

alter policy "owner admin edit expenses" on expenses
  using (
    site_id = private.current_user_site_id()
    and voided_at is null
    and private.current_user_has_role(variadic array['owner','admin'])
  )
  with check (site_id = private.current_user_site_id());

alter policy "site members read expenses" on expenses
  using (site_id = private.current_user_site_id());

-- payments
alter policy "site members read payments" on payments
  using (
    exists (
      select 1 from expenses e
      where e.id = payments.expense_id and e.site_id = private.current_user_site_id()
    )
  );

-- sites
alter policy "members read their sites" on sites
  using (private.user_belongs_to_site(id));

alter policy "owner updates site" on sites
  using (private.user_belongs_to_site(id) and private.current_user_role() = 'owner')
  with check (private.user_belongs_to_site(id) and private.current_user_role() = 'owner');

-- subcategories
alter policy "owner creates subcategories" on subcategories
  with check (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

alter policy "owner deletes subcategories" on subcategories
  using (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

alter policy "owner updates subcategories" on subcategories
  using (site_id = private.current_user_site_id() and private.current_user_role() = 'owner')
  with check (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

alter policy "site members read subcategories" on subcategories
  using (site_id = private.current_user_site_id());

-- user_profiles
alter policy "owner updates site members" on user_profiles
  using (
    private.current_user_role() = 'owner'
    and exists (
      select 1 from user_sites us
      where us.user_id = user_profiles.id and us.site_id = private.current_user_site_id()
    )
  );

alter policy "read profiles on shared site" on user_profiles
  using (
    exists (
      select 1 from user_sites us
      where us.user_id = user_profiles.id and us.site_id = private.current_user_site_id()
    )
  );

alter policy "update own profile" on user_profiles
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (active_site_id is null or private.user_belongs_to_site(active_site_id))
  );

-- user_sites
alter policy "owner admin read site roster" on user_sites
  using (
    site_id = private.current_user_site_id()
    and private.current_user_has_role(variadic array['owner','admin'])
  );

alter policy "owner manages memberships" on user_sites
  with check (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

alter policy "owner removes memberships" on user_sites
  using (
    site_id = private.current_user_site_id()
    and private.current_user_role() = 'owner'
    and user_id <> auth.uid()
  );

alter policy "owner updates memberships" on user_sites
  using (site_id = private.current_user_site_id() and private.current_user_role() = 'owner')
  with check (site_id = private.current_user_site_id() and private.current_user_role() = 'owner');

-- vendors
alter policy "members create vendors" on vendors
  with check (
    site_id = private.current_user_site_id()
    and private.current_user_has_role(variadic array['owner','admin','member'])
  );

alter policy "owner admin update vendors" on vendors
  using (site_id = private.current_user_site_id() and private.current_user_has_role(variadic array['owner','admin']))
  with check (site_id = private.current_user_site_id() and private.current_user_has_role(variadic array['owner','admin']));

alter policy "site members read vendors" on vendors
  using (site_id = private.current_user_site_id());

-- storage.objects (attachments bucket)
alter policy "members upload attachments" on storage.objects
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (private.current_user_site_id())::text
    and private.current_user_has_role(variadic array['owner','admin','member'])
  );

alter policy "site members read attachments" on storage.objects
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (private.current_user_site_id())::text
  );

-- drop the now-unreferenced public versions
drop function public.current_user_has_role(variadic text[]);
drop function public.user_belongs_to_site(uuid);
drop function public.current_user_role();
drop function public.current_user_site_id();
