-- Re-enable Row Level Security, which was intentionally but only ever
-- temporarily disabled in 20260911000200_disable_rls_remove_auth while the
-- auth backend was being rebuilt (frontend was querying with the anon key
-- and no session). Auth has since been rebuilt: the app now has a real
-- login flow (apps/web/app/(auth)/login/page.tsx) and proxy.ts enforces a
-- Supabase session on every route except /login, /auth/*, and /api/cron/*.
-- The temporary bypass was never reverted, leaving every table's existing
-- tenant-isolation policies defined but inert, and `anon` still holding the
-- broad grants given to keep the app working without a session — this let
-- any authenticated user of any site read every other site's data through
-- the same client queries (confirmed live: a user on one site could read
-- another site's expenses via v_monthly_category_summary).
--
-- This restores the pre-bypass state: RLS enforced, and `anon` back to
-- having no table-level access (matching the original "revoke all ... from
-- anon" pattern in 20260821080200_rls_policies.sql). All server-side
-- routes excluded from the auth wall (cron, PIN, operator, team, sites)
-- already use the service-role client, which bypasses RLS entirely, so
-- they are unaffected.

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

revoke all privileges on sites          from anon;
revoke all privileges on user_profiles  from anon;
revoke all privileges on user_sites     from anon;
revoke all privileges on categories     from anon;
revoke all privileges on subcategories  from anon;
revoke all privileges on vendors        from anon;
revoke all privileges on expenses       from anon;
revoke all privileges on payments       from anon;
revoke all privileges on attachments    from anon;
revoke all privileges on audit_log      from anon;
revoke all privileges on budgets        from anon;

revoke select on v_expense_totals,
                  v_monthly_category_summary,
                  v_vendor_totals,
                  v_settlement_by_user,
                  v_vendor_aging
  from anon;
