-- Restrict auth signup to RiverRat household emails only.
-- Rejects any other address at INSERT into auth.users (covers email/password signup).

create or replace function public.enforce_signup_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  addr text := lower(trim(coalesce(NEW.email, '')));
begin
  if addr not in (
    'james.martyka@gmail.com',
    'trish.dhaene@gmail.com'
  ) then
    raise exception 'Signup is limited to household emails.'
      using errcode = 'check_violation';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_signup_email_allowlist on auth.users;
create trigger trg_enforce_signup_email_allowlist
  before insert on auth.users
  for each row
  execute function public.enforce_signup_email_allowlist();

comment on function public.enforce_signup_email_allowlist() is
  'Allows only james.martyka@gmail.com and trish.dhaene@gmail.com to create auth accounts.';
