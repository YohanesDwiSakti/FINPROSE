create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'client');
  profile_role app_role;
  profile_status account_status;
begin
  if requested_role not in ('client', 'lawyer') then
    requested_role := 'client';
  end if;

  profile_role := requested_role::app_role;
  profile_status := case
    when profile_role = 'lawyer' then 'pending_verification'::account_status
    else 'active'::account_status
  end;

  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    new.email,
    profile_role,
    profile_status
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  if profile_role = 'lawyer' then
    insert into public.lawyer_profiles (
      user_id,
      specialty,
      description,
      experience_years,
      consultation_price,
      verification_status
    )
    values (
      new.id,
      'Belum diisi',
      'Profil advokat sedang menunggu verifikasi admin.',
      0,
      150000,
      'pending'
    )
    on conflict (user_id) do nothing;
  else
    insert into public.client_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, full_name, email, role, status)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data->>'full_name'), ''), users.email),
  users.email,
  case
    when users.raw_user_meta_data->>'role' = 'lawyer' then 'lawyer'::app_role
    else 'client'::app_role
  end,
  case
    when users.raw_user_meta_data->>'role' = 'lawyer' then 'pending_verification'::account_status
    else 'active'::account_status
  end
from auth.users
on conflict (id) do nothing;

insert into public.client_profiles (user_id)
select profiles.id
from public.profiles
where profiles.role = 'client'
on conflict (user_id) do nothing;

insert into public.lawyer_profiles (
  user_id,
  specialty,
  description,
  experience_years,
  consultation_price,
  verification_status
)
select
  profiles.id,
  'Belum diisi',
  'Profil advokat sedang menunggu verifikasi admin.',
  0,
  150000,
  'pending'
from public.profiles
where profiles.role = 'lawyer'
on conflict (user_id) do nothing;
