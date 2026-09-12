-- ============================================================================
-- GOK-NET — lock down function EXECUTE grants
--
-- Supabase exposes every function in `public` at /rest/v1/rpc/<name>. Anything
-- SECURITY DEFINER reachable there runs with the definer's privileges, so the
-- default grants are too broad. The database linter flags all of these.
--
-- The grant that matters is to PUBLIC, not to anon/authenticated — in pg_proc
-- ACLs it shows as a bare `=X/postgres`. Revoking from anon and authenticated
-- individually is a no-op, because neither role ever held an explicit grant;
-- they inherit EXECUTE through PUBLIC. So revoke from PUBLIC, then grant back
-- only what is actually needed.
--
-- Postgres checks EXECUTE on a trigger function at CREATE TRIGGER time, not at
-- fire time, so revoking it here does not stop the triggers from firing.
-- ============================================================================

-- ── Trigger functions: never callable over the API, by anyone ──────────────
revoke all on function write_audit_log()                   from public;
revoke all on function recompute_expense_status()          from public;
revoke all on function recompute_status_on_amount_change() from public;
revoke all on function handle_new_auth_user()              from public;
revoke all on function touch_updated_at()                  from public;
revoke all on function block_audit_modification()          from public;

-- ── RLS helpers: `authenticated` needs EXECUTE, because policy expressions
--    are evaluated with the caller's privileges. `anon` never does — no policy
--    grants anon anything. Each returns only facts about the caller's own
--    session, so RPC exposure to a signed-in user is harmless.
revoke all on function current_user_site_id()        from public;
revoke all on function current_user_role()           from public;
revoke all on function user_belongs_to_site(uuid)    from public;
revoke all on function current_user_has_role(text[]) from public;

grant execute on function current_user_site_id()        to authenticated;
grant execute on function current_user_role()           to authenticated;
grant execute on function user_belongs_to_site(uuid)    to authenticated;
grant execute on function current_user_has_role(text[]) to authenticated;

-- ── Stop the next function added here from being world-executable ──────────
alter default privileges in schema public revoke execute on functions from public;
