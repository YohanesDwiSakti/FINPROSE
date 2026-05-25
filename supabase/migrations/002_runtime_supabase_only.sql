create table if not exists public.lawyer_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  experience_years int not null default 0,
  consultation_price int not null default 150000,
  image text not null default '/lawyer1.png',
  description text,
  is_online boolean not null default false,
  languages jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  availability jsonb not null default '[]'::jsonb,
  verification_status verification_status not null default 'verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_consultations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  lawyer_id uuid not null references public.lawyer_directory(id) on delete restrict,
  consultation_type text not null default 'chat',
  scheduled_day text,
  scheduled_time text,
  status consultation_status not null default 'pending',
  price int not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_payments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.app_consultations(id) on delete restrict,
  client_id uuid references public.profiles(id) on delete set null,
  amount int not null,
  admin_fee int not null default 5000,
  tax_amount int not null default 0,
  platform_fee int not null default 0,
  total_amount int not null,
  method text not null default 'bank_transfer',
  provider text,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  external_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lawyer_directory enable row level security;
alter table public.app_consultations enable row level security;
alter table public.app_payments enable row level security;

create policy "Lawyer directory public read"
on public.lawyer_directory for select
using (verification_status = 'verified');

create policy "Lawyer directory admin write"
on public.lawyer_directory for all
using (public.is_admin())
with check (public.is_admin());

create policy "App consultations participant access"
on public.app_consultations for all
using (client_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or public.is_admin());

create policy "App payments participant access"
on public.app_payments for all
using (client_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or public.is_admin());

insert into public.lawyer_directory (
  id, name, specialty, rating, review_count, experience_years, consultation_price,
  image, description, is_online, languages, education, certifications, availability
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'Budi Santoso, S.H., M.H.',
    'Hukum Perdata & Keluarga',
    4.8,
    156,
    12,
    150000,
    '/lawyer1.png',
    'Ahli dalam menangani kasus sengketa tanah, waris, dan perceraian dengan pendekatan mediasi yang humanis namun tetap tegas sesuai koridor hukum.',
    true,
    '["Bahasa Indonesia","English"]'::jsonb,
    '["Sarjana Hukum (S.H.), Universitas Indonesia","Magister Hukum (M.H.), Universitas Gadjah Mada"]'::jsonb,
    '["Izin Praktik Advokat (PERADI)","Sertifikasi Mediator Bersertifikat"]'::jsonb,
    '[{"day":"Senin","times":["09:00","11:00","14:00","16:00"]},{"day":"Rabu","times":["10:00","13:00","15:00"]},{"day":"Jumat","times":["09:00","14:00","15:30"]}]'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Siti Aminah, S.H.',
    'Hukum Bisnis & Kontrak',
    4.9,
    89,
    8,
    250000,
    '/lawyer2.png',
    'Berpengalaman dalam penyusunan kontrak korporasi, audit legalitas usaha, dan pendampingan UMKM dalam mematuhi regulasi pemerintah.',
    false,
    '["Bahasa Indonesia"]'::jsonb,
    '["Sarjana Hukum (S.H.), Universitas Padjadjaran"]'::jsonb,
    '["Izin Praktik Advokat (PERADI)","Certified Legal Auditor"]'::jsonb,
    '[{"day":"Selasa","times":["08:00","10:00","14:00"]},{"day":"Kamis","times":["13:00","15:00","17:00"]}]'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Andi Wijaya, S.H.',
    'Hukum Pidana',
    4.7,
    210,
    15,
    200000,
    '/lawyer1.png',
    'Spesialis pembelaan pidana umum dan tindak pidana korupsi. Berdedikasi memperjuangkan hak klien secara profesional.',
    true,
    '["Bahasa Indonesia","English"]'::jsonb,
    '["Sarjana Hukum (S.H.), Universitas Airlangga"]'::jsonb,
    '["Izin Praktik Advokat (PERADI)","Sertifikasi Spesialis Hukum Pidana"]'::jsonb,
    '[{"day":"Senin","times":["09:00","13:00"]},{"day":"Selasa","times":["10:00","14:00"]},{"day":"Kamis","times":["09:00","11:00"]}]'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Linda Kusuma, S.H., LL.M.',
    'Hukum Pajak & Investasi',
    4.9,
    45,
    10,
    500000,
    '/lawyer2.png',
    'Keahlian khusus pada struktur pajak internasional, kepatuhan investasi, dan penyelesaian sengketa pajak.',
    true,
    '["Bahasa Indonesia","English","Mandarin"]'::jsonb,
    '["Sarjana Hukum (S.H.), Universitas Indonesia","Master of Laws (LL.M.), Leiden University"]'::jsonb,
    '["Izin Praktik Advokat (PERADI)","Konsultan Pajak Bersertifikat (BKP)"]'::jsonb,
    '[{"day":"Senin","times":["10:00","14:00"]},{"day":"Rabu","times":["10:00","14:00"]},{"day":"Jumat","times":["10:00","14:00"]}]'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  specialty = excluded.specialty,
  rating = excluded.rating,
  review_count = excluded.review_count,
  experience_years = excluded.experience_years,
  consultation_price = excluded.consultation_price,
  image = excluded.image,
  description = excluded.description,
  is_online = excluded.is_online,
  languages = excluded.languages,
  education = excluded.education,
  certifications = excluded.certifications,
  availability = excluded.availability,
  updated_at = now();
