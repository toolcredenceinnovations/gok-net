-- ============================================================================
-- GOK-NET — the fixed four categories
--
-- Global, not site-scoped, and is_system = true so they can never be renamed
-- or removed by the Owner. Subcategories underneath them are site-scoped and
-- owner-managed.
-- ============================================================================

insert into categories (name, is_system, sort_order) values
  ('Admin',     true, 1),
  ('Civil',     true, 2),
  ('Marketing', true, 3),
  ('Others',    true, 4)
on conflict (name) do nothing;
