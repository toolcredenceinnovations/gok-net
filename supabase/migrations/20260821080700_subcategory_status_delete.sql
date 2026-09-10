-- ─────────────────────────────────────────────────────────────
-- SUBCATEGORIES — add an "inactive" state, and allow deleting unused ones
--
-- archived_at and inactive_at are mutually exclusive: active (both null),
-- inactive (hidden from the expense picker but easy to bring back), or
-- archived (also hidden, meant to stay hidden). Deleting a subcategory
-- still referenced by an expense is blocked by the existing
-- expenses.subcategory_id foreign key (no ON DELETE clause = restrict).
-- ─────────────────────────────────────────────────────────────
alter table subcategories add column inactive_at timestamptz;

alter table subcategories add constraint subcategory_single_status
  check (not (archived_at is not null and inactive_at is not null));

grant update (inactive_at) on subcategories to authenticated;
grant delete on subcategories to authenticated;

create policy "owner deletes subcategories"
on subcategories for delete to authenticated
using (site_id = current_user_site_id() and current_user_role() = 'owner');
