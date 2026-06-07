-- Migration: 020_platform_profile_extensions.sql
-- Extended lawyer/client fields + compatibility views for FINPROSE demo platform.

alter table public.lawyers
  add column if not exists gender text,
  add column if not exists law_firm text,
  add column if not exists office_location text,
  add column if not exists languages jsonb not null default '["Bahasa Indonesia","English"]'::jsonb,
  add column if not exists education jsonb not null default '["Sarjana Hukum"]'::jsonb,
  add column if not exists certifications jsonb not null default '["Izin Praktik PERADI"]'::jsonb,
  add column if not exists success_rate numeric(5,2) not null default 85.00,
  add column if not exists consultation_count int not null default 0,
  add column if not exists supports_online boolean not null default true,
  add column if not exists supports_offline boolean not null default true;

alter table public.profiles
  add column if not exists gender text,
  add column if not exists membership_status text not null default 'active';

alter table public.consultations
  add column if not exists issue_title text;

alter table public.transactions
  add column if not exists payment_proof_url text,
  add column if not exists invoice_number text;

create table if not exists public.client_favorites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, lawyer_id)
);

alter table public.client_favorites enable row level security;

create policy "Allow owner manage favorites" on public.client_favorites
  for all using (client_id = auth.uid() or public.is_admin());

create or replace view public.documents as
select
  id,
  owner_id,
  consultation_id,
  name,
  file_url,
  file_type,
  file_size,
  visibility,
  created_at
from public.consultation_documents;

create or replace view public.lawyer_directory as
select
  l.id,
  p.full_name as name,
  coalesce(l.bio, '') as description,
  l.experience_years,
  l.consultation_fee,
  l.consultation_fee as consultation_price,
  coalesce(p.avatar_url, '/avatars/lawyer-' || ((abs(hashtext(l.id::text)) % 8) + 1)::text || '.png') as image,
  l.rating,
  l.review_count,
  l.is_online,
  l.verification_status,
  coalesce((
    select string_agg(c.name, ', ')
    from public.lawyer_specializations ls
    join public.categories c on c.id = ls.category_id
    where ls.lawyer_id = l.id
  ), 'General Practice') as specialty,
  coalesce(l.languages, '["Bahasa Indonesia","English"]'::jsonb) as languages,
  coalesce(l.education, '["Sarjana Hukum"]'::jsonb) as education,
  coalesce(l.certifications, '["Izin Praktik PERADI"]'::jsonb) as certifications,
  coalesce((
    select jsonb_agg(jsonb_build_object('day', la.day, 'times', array[to_char(la.start_time, 'HH24:MI'), to_char(la.end_time, 'HH24:MI')]))
    from public.lawyer_availability la
    where la.lawyer_id = l.id
  ), '[]'::jsonb) as availability,
  l.gender,
  l.law_firm,
  l.office_location,
  l.success_rate,
  l.consultation_count,
  l.supports_online,
  l.supports_offline
from public.lawyers l
join public.profiles p on p.id = l.id;

create or replace view public.platform_reviews as
select
  r.id,
  r.consultation_id,
  r.toliver_id as client_id,
  r.lawyer_id,
  r.rating,
  r.comment,
  r.created_at,
  p.full_name as client_name,
  lp.full_name as lawyer_name,
  c.name as category_name
from public.reviews r
join public.profiles p on p.id = r.toliver_id
join public.profiles lp on lp.id = r.lawyer_id
left join public.consultations con on con.id = r.consultation_id
left join public.categories c on c.id = con.category_id;

notify pgrst, 'reload schema';
