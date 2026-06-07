update public.profiles
set status = 'active'
where role = 'lawyer'
  and status = 'pending_verification';

update public.lawyer_profiles
set verification_status = 'verified'
where verification_status = 'pending';

insert into public.lawyer_directory (
  id,
  name,
  specialty,
  description,
  experience_years,
  consultation_price,
  image,
  verification_status,
  languages,
  education,
  certifications,
  availability
)
select
  p.id,
  p.full_name,
  coalesce(nullif(lp.specialty, ''), 'Belum diisi'),
  coalesce(nullif(lp.description, ''), 'Advokat FINPROSE terverifikasi.'),
  coalesce(lp.experience_years, 0),
  coalesce(lp.consultation_price, 150000),
  coalesce(nullif(p.avatar_url, ''), '/lawyer1.png'),
  'verified',
  '["Bahasa Indonesia"]'::jsonb,
  '[]'::jsonb,
  '["Verifikasi otomatis FINPROSE"]'::jsonb,
  '[
    {"day":"Senin","times":["09:00","11:00","14:00"]},
    {"day":"Rabu","times":["10:00","13:00","15:00"]},
    {"day":"Jumat","times":["09:30","13:30","16:00"]}
  ]'::jsonb
from public.profiles p
left join public.lawyer_profiles lp on lp.user_id = p.id
where p.role = 'lawyer'
on conflict (id) do update
set
  name = excluded.name,
  specialty = excluded.specialty,
  description = excluded.description,
  experience_years = excluded.experience_years,
  consultation_price = excluded.consultation_price,
  image = excluded.image,
  verification_status = 'verified',
  updated_at = now();

notify pgrst, 'reload schema';

drop policy if exists "Lawyer directory self write" on public.lawyer_directory;
create policy "Lawyer directory self write"
on public.lawyer_directory for all
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

notify pgrst, 'reload schema';
