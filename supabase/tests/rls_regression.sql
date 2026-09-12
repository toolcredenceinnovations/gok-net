-- ============================================================================
-- GOK-NET — RLS regression test
--
-- Run against a NON-PRODUCTION database. Creates two sites and three users,
-- asserts that site A cannot see site B, that the PIN-gated writes are closed
-- to normal users, that the status trigger derives correctly, and that the
-- audit log cannot be tampered with. Cleans up after itself.
--
--   psql "$DATABASE_URL" -f supabase/tests/rls_regression.sql
--
-- Every row of output should read PASS.
-- ============================================================================

\set QUIET on
\set ON_ERROR_STOP on
begin;

-- ── fixtures ───────────────────────────────────────────────────────────────
insert into sites (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Test Site A', 'test-a'),
  ('22222222-2222-2222-2222-222222222222', 'Test Site B', 'test-b');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','ownera@test.local','x',now(),now(),now(),
   '{"provider":"email"}','{"name":"Owner A"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','membera@test.local','x',now(),now(),now(),
   '{"provider":"email"}','{"name":"Member A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','ownerb@test.local','x',now(),now(),now(),
   '{"provider":"email"}','{"name":"Owner B"}');

insert into user_sites (user_id, site_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','owner'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','member'),
  ('bbbbbbbb-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','owner');

update user_profiles set active_site_id='11111111-1111-1111-1111-111111111111'
  where id like 'aaaaaaaa%';
update user_profiles set active_site_id='22222222-2222-2222-2222-222222222222'
  where id like 'bbbbbbbb%';

insert into expenses (id, site_id, date, description, amount, category_id, created_by)
select '33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',
       current_date,'Cement 500 bags',500000,id,'aaaaaaaa-0000-0000-0000-000000000002'
from categories where name='Civil';

insert into expenses (id, site_id, date, description, amount, category_id, created_by)
select '44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',
       current_date,'SITE B SECRET',999999,id,'bbbbbbbb-0000-0000-0000-000000000003'
from categories where name='Admin';

-- probe: report whether a statement was refused, and how many rows it touched
create or replace function pg_temp.probe(sql text) returns text
language plpgsql as $$
declare n integer;
begin
  execute sql;
  get diagnostics n = row_count;
  return 'rows=' || n;
exception when others then
  return 'BLOCKED';
end $$;

\set QUIET off

-- ── 1. cross-site isolation, as MEMBER on site A ───────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select 'member role resolves'      as test, case when current_user_role()='member' then 'PASS' else 'FAIL' end as result
union all select 'sees own site expense',    case when (select count(*) from expenses)=1 then 'PASS' else 'FAIL' end
union all select 'site B invisible',         case when (select count(*) from expenses
                                                   where site_id='22222222-2222-2222-2222-222222222222')=0
                                                   then 'PASS' else 'FAIL' end
union all select 'audit log hidden',         case when (select count(*) from audit_log)=0 then 'PASS' else 'FAIL' end
union all select 'sees only own site row',   case when (select count(*) from sites)=1 then 'PASS' else 'FAIL' end

-- ── 2. PIN-gated writes are closed to a normal session ─────────────────────
union all select 'payment insert blocked',   case when pg_temp.probe(
  $q$insert into payments (expense_id,amount,mode,paid_by,paid_on,created_by)
     values ('33333333-3333-3333-3333-333333333333',100,'cash',
             'aaaaaaaa-0000-0000-0000-000000000002',current_date,
             'aaaaaaaa-0000-0000-0000-000000000002')$q$)='BLOCKED' then 'PASS' else 'FAIL' end
union all select 'void blocked',             case when pg_temp.probe(
  $q$update expenses set voided_at=now(),voided_by='aaaaaaaa-0000-0000-0000-000000000002',
     void_reason='x' where id='33333333-3333-3333-3333-333333333333'$q$)='BLOCKED' then 'PASS' else 'FAIL' end
union all select 'status write blocked',     case when pg_temp.probe(
  $q$update expenses set status='paid' where id='33333333-3333-3333-3333-333333333333'$q$)='BLOCKED'
  then 'PASS' else 'FAIL' end
union all select 'cross-site insert blocked',case when pg_temp.probe(
  $q$insert into expenses (site_id,date,description,amount,category_id,created_by)
     select '22222222-2222-2222-2222-222222222222',current_date,'intrusion',1,id,
            'aaaaaaaa-0000-0000-0000-000000000002' from categories limit 1$q$)='BLOCKED'
  then 'PASS' else 'FAIL' end
union all select 'audit forge blocked',      case when pg_temp.probe(
  $q$insert into audit_log (site_id,action,entity)
     values ('11111111-1111-1111-1111-111111111111','created','expenses')$q$)='BLOCKED'
  then 'PASS' else 'FAIL' end
-- a member may not edit an expense: RLS filters the row, so 0 rows change
union all select 'member cannot edit expense', case when pg_temp.probe(
  $q$update expenses set description='HACKED' where id='33333333-3333-3333-3333-333333333333'$q$)='rows=0'
  then 'PASS' else 'FAIL' end
union all select 'member may add vendor',    case when pg_temp.probe(
  $q$insert into vendors (site_id,name) values
     ('11111111-1111-1111-1111-111111111111','ABC Traders')$q$)='rows=1' then 'PASS' else 'FAIL' end;

reset role;

-- ── 3. status derivation (service role, i.e. the PIN edge function) ─────────
insert into payments (id,expense_id,amount,mode,paid_by,paid_on,created_by)
values ('55555555-5555-5555-5555-555555555551','33333333-3333-3333-3333-333333333333',
        200000,'cash','aaaaaaaa-0000-0000-0000-000000000002',current_date,
        'aaaaaaaa-0000-0000-0000-000000000001');
select 'pay 2L of 5L -> partial' as test,
       case when (select status from expenses where id='33333333-3333-3333-3333-333333333333')='partial'
       then 'PASS' else 'FAIL' end as result;

insert into payments (id,expense_id,amount,mode,paid_by,paid_on,created_by,
                      cheque_no,cheque_bank,cheque_status)
values ('55555555-5555-5555-5555-555555555552','33333333-3333-3333-3333-333333333333',
        300000,'cheque','aaaaaaaa-0000-0000-0000-000000000001',current_date,
        'aaaaaaaa-0000-0000-0000-000000000001','000123','HDFC','issued');
select 'pay remaining 3L -> paid' as test,
       case when (select status from expenses where id='33333333-3333-3333-3333-333333333333')='paid'
       then 'PASS' else 'FAIL' end as result;

update payments set voided_at=now(),voided_by='aaaaaaaa-0000-0000-0000-000000000001',
                    void_reason='cheque bounced'
where id='55555555-5555-5555-5555-555555555552';
select 'void cheque -> back to partial' as test,
       case when (select status from expenses where id='33333333-3333-3333-3333-333333333333')='partial'
       then 'PASS' else 'FAIL' end as result;

update expenses set amount=150000 where id='33333333-3333-3333-3333-333333333333';
select 'amount cut below paid -> paid' as test,
       case when (select status from expenses where id='33333333-3333-3333-3333-333333333333')='paid'
       then 'PASS' else 'FAIL' end as result;

-- ── 4. audit log is append-only even for the service role ───────────────────
select 'audit UPDATE refused' as test, case when pg_temp.probe(
  $q$update audit_log set action='tampered' where id=(select min(id) from audit_log)$q$)='BLOCKED'
  then 'PASS' else 'FAIL' end as result
union all select 'audit DELETE refused', case when pg_temp.probe(
  $q$delete from audit_log where id=(select min(id) from audit_log)$q$)='BLOCKED'
  then 'PASS' else 'FAIL' end
union all select 'void without reason refused', case when pg_temp.probe(
  $q$update expenses set voided_at=now(),voided_by='aaaaaaaa-0000-0000-0000-000000000001'
     where id='33333333-3333-3333-3333-333333333333'$q$)='BLOCKED' then 'PASS' else 'FAIL' end
union all select 'cheque without status refused', case when pg_temp.probe(
  $q$insert into payments (expense_id,amount,mode,paid_by,paid_on,created_by)
     values ('33333333-3333-3333-3333-333333333333',1,'cheque',
             'aaaaaaaa-0000-0000-0000-000000000001',current_date,
             'aaaaaaaa-0000-0000-0000-000000000001')$q$)='BLOCKED' then 'PASS' else 'FAIL' end
union all select 'audit sees non-expense entities', case when (
    select count(distinct entity) from audit_log where entity='payments') = 1
  then 'PASS' else 'FAIL' end;

-- ── cleanup ────────────────────────────────────────────────────────────────
rollback;
