-- RiverRat-only lockdown: one household, two people (plus bot/service-role paths).

create or replace function private.is_household_email(addr text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(addr, ''))) in (
    'james.martyka@gmail.com',
    'trish.dhaene@gmail.com'
  );
$$;

revoke all on function private.is_household_email(text) from public, anon, authenticated, service_role;

-- Harden signup allowlist to use the helper
create or replace function public.enforce_signup_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_household_email(NEW.email) then
    raise exception 'Signup is limited to household emails.'
      using errcode = 'check_violation';
  end if;
  return NEW;
end;
$$;

-- Never allow a second (or any new) household row once RiverRat exists.
create or replace function public.block_extra_households()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.households) then
    raise exception 'RiverRat is the only household on this site.'
      using errcode = 'check_violation';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_block_extra_households on public.households;
create trigger trg_block_extra_households
  before insert on public.households
  for each row
  execute function public.block_extra_households();

-- Memberships: only the two household emails (bot uses security definer with auth.uid null? usually has uid)
create or replace function public.enforce_membership_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  addr text := lower(trim(coalesce(NEW.email, '')));
  auth_email text;
begin
  select lower(trim(coalesce(u.email, ''))) into auth_email
  from auth.users u where u.id = NEW.user_id;

  if not private.is_household_email(coalesce(nullif(addr, ''), auth_email)) then
    raise exception 'Only household members can join.'
      using errcode = 'check_violation';
  end if;

  if NEW.household_id is distinct from '956ef285-6ba2-4f7b-8df4-f4d7a103ec4f'::uuid
     and exists (select 1 from public.households where id = '956ef285-6ba2-4f7b-8df4-f4d7a103ec4f'::uuid) then
    raise exception 'RiverRat is the only household on this site.'
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_membership_email_allowlist on public.memberships;
create trigger trg_enforce_membership_email_allowlist
  before insert or update on public.memberships
  for each row
  execute function public.enforce_membership_email_allowlist();

-- Rewrite create_household: never mint a new house; return existing membership or refuse.
create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  uid uuid := auth.uid();
  starts date;
  actor_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(trim(coalesce(email, ''))) into actor_email from auth.users where id = uid;
  if not private.is_household_email(actor_email) then
    raise exception 'Signup is limited to household emails.';
  end if;

  select m.household_id into hid
  from public.memberships m
  where m.user_id = uid
  order by m.created_at asc
  limit 1;

  if hid is not null then
    if not exists (select 1 from public.weeks w where w.household_id = hid) then
      starts := private.week_start(0, current_date);
      insert into public.weeks (household_id, starts_on, status)
      values (hid, starts, 'voting');
    end if;
    return hid;
  end if;

  -- Prefer the sole RiverRat house if present
  select id into hid from public.households
  where id = '956ef285-6ba2-4f7b-8df4-f4d7a103ec4f'::uuid
  limit 1;

  if hid is null then
    select id into hid from public.households order by created_at asc limit 1;
  end if;

  if hid is not null then
    raise exception 'Ask for an invite link to join RiverRat. New houses are disabled.';
  end if;

  raise exception 'RiverRat household is missing. Contact the site owner.';
end;
$$;

-- Ban leftover non-household auth users so they cannot log in.
-- Does not delete auth.users rows.
update auth.users
set banned_until = 'infinity'::timestamptz
where not private.is_household_email(email);

-- Trigger helpers are not RPCs. Meal, recipe, shopping, and ballot writes are untouched.
revoke all on function public.enforce_signup_email_allowlist() from public, anon, authenticated, service_role;
revoke all on function public.block_extra_households() from public, anon, authenticated, service_role;
revoke all on function public.enforce_membership_email_allowlist() from public, anon, authenticated, service_role;
