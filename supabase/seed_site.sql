-- ============================================================================
-- GOK-NET — one-time site setup
--
-- Fill in the five values below and run once against the project. Creates the
-- site, its Owner membership, a starter set of subcategories, and the action
-- PIN. Everything else the app creates itself.
--
--   psql "$DATABASE_URL" -f supabase/seed_site.sql
--
-- The Owner must have signed in at least once first, so that Supabase Auth
-- has created their auth.users row (and the trigger, their user_profiles row).
-- ============================================================================

\set site_name    'REPLACE — e.g. Gokulesh Residency'
\set site_slug    'REPLACE — e.g. gokulesh-residency'
\set site_address 'REPLACE — site address'
\set owner_email  'REPLACE — the email or phone the Owner signs in with'
\set action_pin   'REPLACE — 6 digits, e.g. 481920'

begin;

-- ── 1. the site ─────────────────────────────────────────────────────────────
insert into sites (name, slug, address, plan, settings)
values (
  :'site_name',
  :'site_slug',
  :'site_address',
  'basic',
  jsonb_build_object(
    'currency', 'INR',
    'date_format', 'DD/MM/YYYY',
    -- The PIN hash lives here: per-site, server-only, never returned to a
    -- client (the `sites` select grant deliberately omits this column).
    'pin_hash', extensions.crypt(:'action_pin', extensions.gen_salt('bf', 10)),
    'features', jsonb_build_object(
      'settlement', false,
      'budget_tracking', false,
      'cheque_lifecycle', false
    )
  )
)
on conflict (slug) do nothing;

-- ── 2. make the Owner an owner of it ────────────────────────────────────────
insert into user_sites (user_id, site_id, role)
select u.id, s.id, 'owner'
from auth.users u
cross join sites s
where s.slug = :'site_slug'
  and (u.email = :'owner_email' or u.phone = :'owner_email')
on conflict (user_id, site_id) do update set role = 'owner';

-- ── 3. point them at it ─────────────────────────────────────────────────────
update user_profiles p
set active_site_id = s.id
from sites s, auth.users u
where s.slug = :'site_slug'
  and p.id = u.id
  and (u.email = :'owner_email' or u.phone = :'owner_email');

-- ── 4. a few subcategories to start from ────────────────────────────────────
-- Owner-managed from here; archived, never deleted.
insert into subcategories (site_id, category_id, name)
select s.id, c.id, x.name
from sites s
cross join lateral (values
  ('Civil',     'Cement'),
  ('Civil',     'Steel / TMT'),
  ('Civil',     'Sand & Aggregate'),
  ('Civil',     'Labour'),
  ('Civil',     'Plumbing'),
  ('Civil',     'Electrical'),
  ('Admin',     'Office rent'),
  ('Admin',     'Stationery'),
  ('Admin',     'Professional fees'),
  ('Marketing', 'Hoardings'),
  ('Marketing', 'Digital ads'),
  ('Marketing', 'Brochures'),
  ('Others',    'Transport'),
  ('Others',    'Miscellaneous')
) as x(category, name)
join categories c on c.name = x.category
where s.slug = :'site_slug'
on conflict (site_id, category_id, name) do nothing;

commit;

-- ── verify ──────────────────────────────────────────────────────────────────
select s.name, s.slug,
       (select count(*) from user_sites  us where us.site_id = s.id) as members,
       (select count(*) from subcategories sc where sc.site_id = s.id) as subcategories,
       (s.settings ? 'pin_hash') as pin_set
from sites s where s.slug = :'site_slug';
