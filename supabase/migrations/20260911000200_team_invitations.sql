-- Team invitations support owners setting up access before a worker signs in.
-- Phone values are canonical digits (country code included) so OTP identities
-- and invitations can be matched without formatting differences.

create table team_invitations (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  phone       text not null check (phone ~ '^\d{7,15}$'),
  role        text not null check (role in ('admin', 'member', 'viewer')),
  invited_by  uuid not null references user_profiles(id),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references user_profiles(id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint accepted_fields_consistent check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_by is null and accepted_at is null)
  )
);

create unique index team_invitations_one_pending_phone_per_site
  on team_invitations (site_id, phone) where status = 'pending';
create index team_invitations_pending_phone_idx
  on team_invitations (phone, expires_at) where status = 'pending';
create index user_sites_site_role_idx on user_sites (site_id, role);

alter table team_invitations enable row level security;
revoke all on team_invitations from anon, authenticated;
grant select on team_invitations to authenticated;

create policy "owner reads site invitations"
on team_invitations for select to authenticated
using (site_id = current_user_site_id() and current_user_role() = 'owner');

-- This invariant is enforced in the database so every client and admin route
-- is prevented from removing or demoting the site's final owner.
create or replace function protect_last_site_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.role = 'owner' and (TG_OP = 'DELETE' or NEW.role <> 'owner') then
    if (select count(*) from user_sites where site_id = OLD.site_id and role = 'owner') <= 1 then
      raise exception 'A site must always have at least one owner';
    end if;
  end if;
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

create trigger user_sites_protect_last_owner
before update or delete on user_sites
for each row execute function protect_last_site_owner();

-- Claim every live invitation for the verified phone as soon as the auth
-- profile exists. This also works when a phone is added to an existing profile.
create or replace function claim_team_invitations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g');
begin
  if length(v_phone) < 7 then return NEW; end if;

  update team_invitations
     set status = 'expired', updated_at = now()
   where phone = v_phone and status = 'pending' and expires_at <= now();

  insert into user_sites (user_id, site_id, role)
  select NEW.id, i.site_id, i.role
    from team_invitations i
   where i.phone = v_phone and i.status = 'pending' and i.expires_at > now()
  on conflict (user_id, site_id) do nothing;

  update team_invitations
     set status = 'accepted', accepted_by = NEW.id, accepted_at = now(), updated_at = now()
   where phone = v_phone and status = 'pending' and expires_at > now()
     and exists (select 1 from user_sites us where us.user_id = NEW.id and us.site_id = team_invitations.site_id);

  if NEW.active_site_id is null then
    update user_profiles up
       set active_site_id = chosen.site_id
      from (select us.site_id from user_sites us where us.user_id = NEW.id order by us.created_at limit 1) chosen
     where up.id = NEW.id and up.active_site_id is null;
  end if;
  return NEW;
end;
$$;

create trigger user_profiles_claim_team_invitations
after insert or update of phone on user_profiles
for each row execute function claim_team_invitations();

revoke execute on function protect_last_site_owner() from public, anon, authenticated;
revoke execute on function claim_team_invitations() from public, anon, authenticated;
