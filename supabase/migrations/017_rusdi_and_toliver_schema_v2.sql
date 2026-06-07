-- Migration: 017_rusdi_and_toliver_schema_v2.sql
-- Goal: Drop old tables/views, create 17 normalized tables, set up RBAC constraints, and seed realistic data.

-- 1. Drop old triggers, views, and tables (if they exist) to ensure clean re-schema
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();
drop function if exists public.is_admin();

drop view if exists public.lawyer_directory;
drop view if exists public.app_consultations;
drop view if exists public.app_payments;

drop table if exists public.audit_logs cascade;
drop table if exists public.reports cascade;
drop table if exists public.notifications cascade;
drop table if exists public.ai_file_uploads cascade;
drop table if exists public.ai_messages cascade;
drop table if exists public.ai_conversations cascade;
drop table if exists public.ai_chat_history cascade;
drop table if exists public.reviews cascade;
drop table if exists public.appointments cascade;
drop table if exists public.consultation_documents cascade;
drop table if exists public.documents cascade;
drop table if exists public.transactions cascade;
drop table if exists public.payments cascade;
drop table if exists public.consultations cascade;
drop table if exists public.messages cascade;
drop table if exists public.chat_sessions cascade;
drop table if exists public.lawyer_availability cascade;
drop table if exists public.lawyer_specializations cascade;
drop table if exists public.lawyer_profiles cascade;
drop table if exists public.client_profiles cascade;
drop table if exists public.categories cascade;
drop table if exists public.legal_categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- Drop custom types if they exist
drop type if exists app_role cascade;
drop type if exists account_status cascade;
drop type if exists verification_status cascade;
drop type if exists consultation_status cascade;
drop type if exists payment_status cascade;

-- 2. Create custom types
create type app_role as enum ('toliver', 'lawyer', 'admin');
create type account_status as enum ('active', 'pending_verification', 'suspended', 'blocked');
create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type consultation_status as enum ('pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled', 'expired');
create type payment_status as enum ('pending', 'waiting_payment', 'waiting_verification', 'paid', 'rejected', 'expired', 'refunded');

-- 3. Create 17 Normalized Tables

-- Table 1: users
create table public.users (
  id uuid primary key,
  email text not null unique,
  role app_role not null default 'toliver',
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 2: profiles
create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role text,
  status text,
  avatar_url text,
  bio text,
  address text,
  identity_number text,
  date_of_birth date,
  emergency_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 3: lawyers
create table public.lawyers (
  id uuid primary key references public.users(id) on delete cascade,
  bio text,
  experience_years int not null default 0,
  consultation_fee int not null default 150000,
  rating numeric(3,2) not null default 0.00,
  review_count int not null default 0,
  is_online boolean not null default false,
  verification_status verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 4: categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon_url text,
  created_at timestamptz not null default now()
);

-- Table 5: lawyer_specializations (many-to-many relationship)
create table public.lawyer_specializations (
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (lawyer_id, category_id)
);

-- Table 6: lawyer_availability
create table public.lawyer_availability (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  day text not null, -- e.g., 'Senin', 'Selasa', etc.
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

-- Table 7: consultations
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  toliver_id uuid not null references public.users(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  consultation_type text not null default 'chat', -- 'chat', 'video', 'voice'
  meeting_mode text not null default 'virtual', -- 'virtual', 'in_person'
  scheduled_date date,
  scheduled_time time,
  duration_minutes int not null default 60,
  status text not null default 'pending', -- 'pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled', 'expired'
  price int not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 8: consultation_documents (was documents)
create table public.consultation_documents (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size int,
  visibility text not null default 'private', -- 'private', 'shared'
  created_at timestamptz not null default now()
);

-- Table 9: appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time not null,
  status text not null default 'scheduled', -- 'scheduled', 'rescheduled', 'completed', 'cancelled'
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 10: reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete cascade,
  toliver_id uuid not null references public.users(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Table 11: transactions (was payments)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  toliver_id uuid not null references public.users(id) on delete cascade,
  amount int not null,
  admin_fee int not null default 5000,
  tax_amount int not null default 0,
  platform_fee int not null default 0,
  total_amount int not null,
  method text not null default 'bank_transfer',
  provider text,
  status text not null default 'pending', -- 'pending', 'paid', 'failed', 'refunded', 'expired'
  paid_at timestamptz,
  external_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 12: notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info', -- 'info', 'alert', 'success'
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Table 13: ai_conversations
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 14: ai_messages
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Table 15: ai_file_uploads
create table public.ai_file_uploads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size int,
  extracted_text text,
  analysis_results jsonb,
  created_at timestamptz not null default now()
);

-- Table 16: audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Table 17: reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null, -- 'financial', 'consultation', 'ai_usage'
  parameters jsonb,
  summary_data jsonb,
  generated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. Set up Row Level Security (RLS) and Policies
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.lawyers enable row level security;
alter table public.categories enable row level security;
alter table public.lawyer_specializations enable row level security;
alter table public.lawyer_availability enable row level security;
alter table public.consultations enable row level security;
alter table public.consultation_documents enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_file_uploads enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reports enable row level security;

-- Helper admin checker function
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Policies for users
create policy "Allow all operations for admins on users" on public.users for all using (public.is_admin());
create policy "Allow select own user" on public.users for select using (id = auth.uid());

-- Policies for profiles
create policy "Allow public read profiles" on public.profiles for select using (true);
create policy "Allow update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "Allow insert own profile" on public.profiles for insert with check (id = auth.uid() or public.is_admin());

-- Policies for lawyers
create policy "Allow public read verified lawyers" on public.lawyers for select using (verification_status = 'verified' or id = auth.uid() or public.is_admin());
create policy "Allow update own lawyer profile" on public.lawyers for update using (id = auth.uid() or public.is_admin());
create policy "Allow insert own lawyer profile" on public.lawyers for insert with check (id = auth.uid() or public.is_admin());

-- Policies for categories
create policy "Allow public read categories" on public.categories for select using (true);
create policy "Allow admin write categories" on public.categories for all using (public.is_admin());

-- Policies for lawyer_specializations
create policy "Allow public read specializations" on public.lawyer_specializations for select using (true);
create policy "Allow lawyer write own specialization" on public.lawyer_specializations for all using (lawyer_id = auth.uid() or public.is_admin());

-- Policies for lawyer_availability
create policy "Allow public read availability" on public.lawyer_availability for select using (true);
create policy "Allow lawyer write own availability" on public.lawyer_availability for all using (lawyer_id = auth.uid() or public.is_admin());

-- Policies for consultations
create policy "Allow participants select consultations" on public.consultations for select using (toliver_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());
create policy "Allow participants insert consultations" on public.consultations for insert with check (toliver_id = auth.uid() or public.is_admin());
create policy "Allow participants update consultations" on public.consultations for update using (toliver_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

-- Policies for consultation_documents
create policy "Allow access consultation documents" on public.consultation_documents for all using (
  owner_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.consultations c where c.id = consultation_id and (c.toliver_id = auth.uid() or c.lawyer_id = auth.uid())
  )
);

-- Policies for appointments
create policy "Allow access appointments" on public.appointments for all using (
  exists (
    select 1 from public.consultations c where c.id = consultation_id and (c.toliver_id = auth.uid() or c.lawyer_id = auth.uid())
  ) or public.is_admin()
);

-- Policies for reviews
create policy "Allow public read reviews" on public.reviews for select using (true);
create policy "Allow toliver write reviews" on public.reviews for insert with check (toliver_id = auth.uid());
create policy "Allow admin delete reviews" on public.reviews for delete using (public.is_admin());

-- Policies for transactions
create policy "Allow toliver and admin access transactions" on public.transactions for all using (toliver_id = auth.uid() or public.is_admin());

-- Policies for notifications
create policy "Allow select own notifications" on public.notifications for select using (user_id = auth.uid() or public.is_admin());
create policy "Allow update own notifications" on public.notifications for update using (user_id = auth.uid() or public.is_admin());

-- Policies for AI conversations
create policy "Allow user access conversations" on public.ai_conversations for all using (user_id = auth.uid() or public.is_admin());

-- Policies for AI messages
create policy "Allow user access messages" on public.ai_messages for all using (
  exists (
    select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
  ) or public.is_admin()
);

-- Policies for AI file uploads
create policy "Allow user access uploads" on public.ai_file_uploads for all using (user_id = auth.uid() or public.is_admin());

-- Policies for audit logs
create policy "Allow admin access audit logs" on public.audit_logs for all using (public.is_admin());

-- Policies for reports
create policy "Allow admin access reports" on public.reports for all using (public.is_admin());

-- 5. Trigger for auth.users sync
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'toliver');
  user_role app_role;
  account_status account_status;
begin
  if requested_role = 'client' then
    requested_role := 'toliver';
  end if;

  if requested_role not in ('toliver', 'lawyer', 'admin') then
    requested_role := 'toliver';
  end if;

  user_role := requested_role::app_role;
  account_status := case
    when user_role = 'lawyer' then 'pending_verification'::account_status
    else 'active'::account_status
  end;

  insert into public.users (id, email, role, status)
  values (new.id, new.email, user_role, account_status)
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    new.email,
    user_role::text,
    account_status::text
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  if user_role = 'lawyer' then
    insert into public.lawyers (id, bio, experience_years, consultation_fee, verification_status)
    values (
      new.id,
      'Profil advokat baru.',
      0,
      150000,
      'pending'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Trigger to sync role and status from public.users to public.profiles automatically
create or replace function public.sync_profiles_role_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set 
    role = new.role::text,
    status = new.status::text,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger sync_profiles_role_status_trigger
after insert or update of role, status on public.users
for each row execute function public.sync_profiles_role_status();

-- Sync existing auth.users into new schema
insert into public.users (id, email, role, status)
select
  id,
  email,
  case
    when raw_user_meta_data->>'role' = 'lawyer' then 'lawyer'::app_role
    when raw_user_meta_data->>'role' = 'admin' then 'admin'::app_role
    else 'toliver'::app_role
  end,
  case
    when raw_user_meta_data->>'role' = 'lawyer' then 'pending_verification'::account_status
    else 'active'::account_status
  end
from auth.users
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email, role, status)
select
  u.id,
  coalesce(nullif(trim(au.raw_user_meta_data->>'full_name'), ''), au.email),
  au.email,
  u.role::text,
  u.status::text
from auth.users au
join public.users u on u.id = au.id
on conflict (id) do nothing;

insert into public.lawyers (id, bio, experience_years, consultation_fee, verification_status)
select
  id,
  'Profil advokat terdaftar.',
  5,
  150000,
  'verified'
from public.users
where role = 'lawyer'
on conflict (id) do nothing;


-- 6. Create Compatibility Views (Crucial for existing React / Go queries)
create or replace view public.lawyer_directory as
select
  l.id,
  p.full_name as name,
  coalesce(l.bio, '') as description,
  l.experience_years,
  l.consultation_fee,
  l.consultation_fee as consultation_price,
  coalesce(p.avatar_url, '/lawyer1.png') as image,
  l.rating,
  l.review_count,
  l.is_online,
  l.verification_status,
  -- Combine specializations into a single string for legacy UI compatibility
  coalesce((
    select string_agg(c.name, ', ')
    from public.lawyer_specializations ls
    join public.categories c on c.id = ls.category_id
    where ls.lawyer_id = l.id
  ), 'Hukum Umum') as specialty,
  -- Dummy JSON fields to match JSONB columns of legacy lawyer_directory table
  to_jsonb(array['Bahasa Indonesia', 'English']) as languages,
  to_jsonb(array['Sarjana Hukum']) as education,
  to_jsonb(array['Izin Praktik PERADI']) as certifications,
  -- Format availability
  coalesce((
    select jsonb_agg(jsonb_build_object('day', la.day, 'times', array[to_char(la.start_time, 'HH24:MI'), to_char(la.end_time, 'HH24:MI')]))
    from public.lawyer_availability la
    where la.lawyer_id = l.id
  ), '[]'::jsonb) as availability
from public.lawyers l
join public.profiles p on p.id = l.id;

create or replace view public.app_consultations as
select
  c.id,
  c.toliver_id as client_id, -- Maps client_id to toliver_id
  c.lawyer_id,
  c.consultation_type,
  c.scheduled_date::text as scheduled_day,
  c.scheduled_time::text as scheduled_time,
  c.status::consultation_status as status,
  c.price,
  c.notes,
  c.created_at,
  c.updated_at
from public.consultations c;

create or replace view public.app_payments as
select
  t.id,
  t.consultation_id,
  t.toliver_id as client_id,
  t.amount,
  t.admin_fee,
  t.tax_amount,
  t.platform_fee,
  t.total_amount,
  t.method,
  t.provider,
  t.status::payment_status as status,
  t.paid_at,
  t.external_reference,
  t.created_at,
  t.updated_at
from public.transactions t;

create or replace view public.admin_pending_lawyers as
select
  l.id as user_id,
  l.id,
  coalesce((
    select string_agg(c.name, ', ')
    from public.lawyer_specializations ls
    join public.categories c on c.id = ls.category_id
    where ls.lawyer_id = l.id
  ), 'Hukum Umum') as specialty,
  l.bio as description,
  l.experience_years,
  l.consultation_fee as consultation_price,
  l.verification_status,
  json_build_object(
    'full_name', p.full_name,
    'email', p.email,
    'status', u.status,
    'avatar_url', p.avatar_url
  ) as profiles
from public.lawyers l
join public.profiles p on p.id = l.id
join public.users u on u.id = l.id;

create or replace view public.admin_clients as
select
  u.id,
  p.full_name,
  u.email,
  p.phone,
  u.role,
  u.status,
  u.created_at
from public.users u
join public.profiles p on p.id = u.id;

-- Create Compatibility View for ai_chat_history (maps old chat schema to normalized conversations/messages)
create or replace view public.ai_chat_history as
select
  m.id,
  c.id::text as session_id,
  c.user_id,
  m.role,
  m.content as message,
  m.created_at as timestamp
from public.ai_messages m
join public.ai_conversations c on c.id = m.conversation_id;

-- Trigger to handle INSERT into public.ai_chat_history view
create or replace function public.handle_insert_ai_chat_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  -- Try to parse session_id as uuid. If it is not a valid UUID, generate/lookup.
  begin
    conv_id := new.session_id::uuid;
  exception when others then
    select id into conv_id from public.ai_conversations where title = new.session_id and user_id = new.user_id limit 1;
    if conv_id is null then
      insert into public.ai_conversations (user_id, title)
      values (new.user_id, new.session_id)
      returning id into conv_id;
    end if;
  end;

  -- Ensure the conversation exists
  insert into public.ai_conversations (id, user_id, title)
  values (conv_id, new.user_id, 'Percakapan AI')
  on conflict (id) do nothing;

  -- Insert the message
  insert into public.ai_messages (conversation_id, role, content, created_at)
  values (conv_id, new.role, new.message, coalesce(new.timestamp, now()));

  return new;
end;
$$;

create trigger insert_ai_chat_history_trigger
instead of insert on public.ai_chat_history
for each row execute function public.handle_insert_ai_chat_history();

-- Trigger to handle DELETE from public.ai_chat_history view
create or replace function public.handle_delete_ai_chat_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_conversations
  where id::text = old.session_id;
  return old;
end;
$$;

create trigger delete_ai_chat_history_trigger
instead of delete on public.ai_chat_history
for each row execute function public.handle_delete_ai_chat_history();



-- 7. High-Volume PL/pgSQL Seeder
-- Generates 10 categories, 300 Tolivers, 100 Lawyers, 500 Consultations, 1000 Reviews, and 800 Transactions
do $$
declare
  -- Arrays of realistic names
  first_names text[] := array['Budi', 'Joko', 'Andi', 'Siti', 'Dewi', 'Rian', 'Eko', 'Agus', 'Surya', 'Wawan', 'Dedi', 'Bambang', 'Rudi', 'Hendra', 'Taufik', 'Indra', 'Bagus', 'Arief', 'Hasan', 'Yusuf', 'Kartika', 'Indah', 'Mega', 'Sari', 'Putri', 'Ayu', 'Rini', 'Dian', 'Laras', 'Novi', 'Fajar', 'Aditya', 'Gita', 'Wulan', 'Dimas', 'Reza', 'Beni', 'Heri', 'Imran', 'Lia', 'Maya', 'Nita', 'Tari', 'Rahmat', 'Anwar', 'Bayu', 'Riki', 'Zaki', 'Putra', 'Tri'];
  last_names text[] := array['Santoso', 'Wijaya', 'Hidayat', 'Prasetyo', 'Kusuma', 'Sari', 'Lestari', 'Putra', 'Pratama', 'Gunawan', 'Setiawan', 'Wibowo', 'Nugroho', 'Budiman', 'Hadi', 'Saputra', 'Kurniawan', 'Ramadhan', 'Siregar', 'Lubis', 'Tarigan', 'Manurung', 'Nasution', 'Ginting', 'Sembiring', 'Harahap', 'Tanjung', 'Pasaribu', 'Simanjuntak', 'Pohan', 'Sitorus', 'Marpaung', 'Sinaga', 'Hasibuan', 'Damanik'];

  -- Categories ID array
  cat_ids uuid[];
  cat_names text[] := array['Hukum Pidana', 'Hukum Perdata', 'Hukum Keluarga', 'Hukum Ketenagakerjaan', 'Hukum Pajak', 'Hukum Bisnis & Korporasi', 'Kejahatan Siber', 'Hak Kekayaan Intelektual', 'Sengketa Tanah & Properti', 'Hukum Imigrasi'];
  cat_descs text[] := array[
    'Pendampingan kasus kejahatan, penipuan, penganiayaan, dan tuntutan hukum pidana lainnya.',
    'Penyelesaian sengketa hutang piutang, wanprestasi kontrak, perbuatan melawan hukum.',
    'Konsultasi perceraian, pembagian harta gono-gini, hak asuh anak, dan mediasi keluarga.',
    'Penyelesaian perselisihan PHK sepihak, pesangon, kontrak kerja, dan jaminan sosial.',
    'Audit kepatuhan perpajakan, banding pajak, restitusi, dan perencanaan pajak.',
    'Pendirian badan usaha, tinjauan kontrak komersial, merger, akuisisi, regulasi kepatuhan.',
    'Penanganan kasus pencemaran nama baik online, UU ITE, penipuan e-commerce, kebocoran data.',
    'Pendaftaran hak cipta, merek dagang, paten, rahasia dagang, dan gugatan pelanggaran HAKI.',
    'Penyelesaian sengketa kepemilikan tanah, sertifikat ganda, penyerobotan lahan, sewa-menyewa.',
    'Pengurusan visa kerja, izin tinggal (ITAS/ITAP), deportasi, kewarganegaraan ganda.'
  ];

  -- Toliver and Lawyer lists
  toliver_ids uuid[];
  lawyer_ids uuid[];

  -- Counters and loop variables
  i int;
  idx_first int;
  idx_last int;
  full_name text;
  email text;
  uid uuid;
  cid uuid;
  lid uuid;
  category_id uuid;
  consultation_id uuid;

  -- Random values
  rand_years int;
  rand_fee int;
  rand_rating numeric(3,2);
  rand_reviews int;
  rand_price int;
  rand_days int;
  rand_hour int;
  rand_min int;
  rand_date date;
  rand_time time;
  rand_status text;
  rand_type text;
  rand_method text;
  rand_pstatus text;
  
  -- Array statuses
  c_statuses text[] := array['completed', 'completed', 'completed', 'ongoing', 'pending', 'cancelled', 'expired'];
  m_types text[] := array['chat', 'video', 'voice'];
  p_methods text[] := array['bank_transfer', 'ewallet', 'credit_card'];
  p_statuses text[] := array['paid', 'paid', 'paid', 'pending', 'failed', 'expired'];
  review_comments text[] := array[
    'Sangat membantu dan solutif. Penjelasannya mudah dipahami.',
    'Rekomendasi yang luar biasa, pengacara sangat berpengalaman.',
    'Kurang responsif dalam sesi chat, tapi penjelasannya cukup logis.',
    'Sangat puas dengan jawabannya, langsung to the point.',
    'Sangat profesional dalam membedah kasus perdata saya.',
    'Terima kasih atas sarannya yang sangat praktis dan jelas.',
    'Penjelasannya sangat detail mengenai pasal-pasal UU ITE.',
    'Sangat tenang dan mengayomi, membantu meredakan kecemasan keluarga.',
    'Konsultasi bisnis yang sangat bermanfaat bagi startup kami.',
    'Sangat ramah dan sabar mendengarkan keluh kesah saya.'
  ];

begin
  -- 7a. Seed categories
  for i in 1..10 loop
    insert into public.categories (name, description, icon_url)
    values (cat_names[i], cat_descs[i], '/icons/cat-' || i || '.svg')
    on conflict (name) do update set description = excluded.description
    returning id into category_id;
    cat_ids := array_append(cat_ids, category_id);
  end loop;

  -- 7b. Seed 300 Toliver users
  for i in 1..300 loop
    uid := gen_random_uuid();
    idx_first := floor(random() * array_length(first_names, 1) + 1)::int;
    idx_last := floor(random() * array_length(last_names, 1) + 1)::int;
    full_name := first_names[idx_first] || ' ' || last_names[idx_last];
    email := lower(first_names[idx_first]) || '.' || lower(last_names[idx_last]) || i || '@toliver.finpro.id';

    insert into public.users (id, email, role, status, created_at)
    values (uid, email, 'toliver', 'active', now() - (random() * 365 * interval '1 day'))
    on conflict do nothing;

    insert into public.profiles (id, full_name, phone, avatar_url, bio, address, identity_number, date_of_birth, emergency_contact)
    values (
      uid,
      full_name,
      '0812' || floor(10000000 + random() * 90000000)::text,
      '/avatars/toliver-' || (floor(random() * 6) + 1)::text || '.png',
      'Halo, saya Toliver di platform FinPro Legal.',
      'Jl. Raya No. ' || i || ', Jakarta, Indonesia',
      '3171' || floor(100000000000 + random() * 900000000000)::text,
      '1970-01-01'::date + (random() * 12000 * interval '1 day'),
      'Kerabat - 0813' || floor(10000000 + random() * 90000000)::text
    )
    on conflict do nothing;

    toliver_ids := array_append(toliver_ids, uid);
  end loop;

  -- 7c. Seed 100 Lawyer users
  for i in 1..100 loop
    uid := gen_random_uuid();
    idx_first := floor(random() * array_length(first_names, 1) + 1)::int;
    idx_last := floor(random() * array_length(last_names, 1) + 1)::int;
    full_name := first_names[idx_first] || ' ' || last_names[idx_last] || ', S.H., M.H.';
    email := lower(first_names[idx_first]) || '.' || lower(last_names[idx_last]) || i || '@lawyer.finpro.id';

    insert into public.users (id, email, role, status, created_at)
    values (uid, email, 'lawyer', 'active', now() - (random() * 365 * interval '1 day'))
    on conflict do nothing;

    insert into public.profiles (id, full_name, phone, avatar_url, bio, address)
    values (
      uid,
      full_name,
      '0813' || floor(10000000 + random() * 90000000)::text,
      '/avatars/lawyer-' || (floor(random() * 8) + 1)::text || '.png',
      'Advokat berpengalaman bersertifikasi PERADI.',
      'Ruko Law Firm Office No. ' || i || ', Surabaya, Indonesia'
    )
    on conflict do nothing;

    rand_years := floor(random() * 24 + 2)::int; -- 2 to 25 years
    rand_fee := 150000 + (floor(random() * 12) * 50000)::int; -- Rp 150.000 to Rp 750.000
    rand_rating := (4.00 + random() * 1.00)::numeric(3,2);

    insert into public.lawyers (id, bio, experience_years, consultation_fee, rating, review_count, is_online, verification_status)
    values (
      uid,
      'Fokus mendampingi klien untuk mendapatkan kepastian hukum dengan menjunjung tinggi etika profesi.',
      rand_years,
      rand_fee,
      rand_rating,
      0, -- Will increment with reviews
      (random() > 0.5),
      'verified'
    )
    on conflict do nothing;

    -- Assign 1 or 2 specializations
    category_id := cat_ids[floor(random() * 10 + 1)::int];
    insert into public.lawyer_specializations (lawyer_id, category_id)
    values (uid, category_id) on conflict do nothing;
    
    if random() > 0.6 then
      insert into public.lawyer_specializations (lawyer_id, category_id)
      values (uid, cat_ids[floor(random() * 10 + 1)::int]) on conflict do nothing;
    end if;

    -- Assign weekly availability
    insert into public.lawyer_availability (lawyer_id, day, start_time, end_time)
    values 
      (uid, 'Senin', '09:00:00'::time, '12:00:00'::time),
      (uid, 'Rabu', '13:00:00'::time, '16:00:00'::time),
      (uid, 'Jumat', '14:00:00'::time, '17:00:00'::time)
    on conflict do nothing;

    lawyer_ids := array_append(lawyer_ids, uid);
  end loop;

  -- 7d. Seed 500 Consultations and 800 Transactions
  -- We link transactions to consultations (paid/failed/expired)
  for i in 1..500 loop
    consultation_id := gen_random_uuid();
    lid := lawyer_ids[floor(random() * array_length(lawyer_ids, 1) + 1)::int];
    cid := toliver_ids[floor(random() * array_length(toliver_ids, 1) + 1)::int];
    
    -- Find category of the lawyer
    select category_id into category_id from public.lawyer_specializations where lawyer_id = lid limit 1;
    if category_id is null then
      category_id := cat_ids[1];
    end if;

    select consultation_fee into rand_price from public.lawyers where id = lid;

    rand_status := c_statuses[floor(random() * array_length(c_statuses, 1) + 1)::int];
    rand_type := m_types[floor(random() * array_length(m_types, 1) + 1)::int];
    rand_days := floor(random() * 90)::int; -- last 3 months
    rand_hour := 9 + floor(random() * 8)::int; -- 9:00 to 17:00
    rand_min := floor(random() * 4) * 15; -- 0, 15, 30, 45
    
    rand_date := current_date - rand_days;
    rand_time := (to_char(rand_hour, '00') || ':' || to_char(rand_min, '00') || ':00')::time;

    -- Insert consultation
    insert into public.consultations (id, toliver_id, lawyer_id, category_id, consultation_type, meeting_mode, scheduled_date, scheduled_time, duration_minutes, status, price, notes, created_at)
    values (
      consultation_id,
      cid,
      lid,
      category_id,
      rand_type,
      'virtual',
      rand_date,
      rand_time,
      60,
      rand_status,
      rand_price,
      'Brainstorming permasalahan hukum legalitas umum.',
      (rand_date + rand_time - interval '2 hours')::timestamptz
    );

    -- Insert appointments
    if rand_status in ('ongoing', 'completed') then
      insert into public.appointments (consultation_id, scheduled_date, scheduled_time, status, notes)
      values (
        consultation_id,
        rand_date,
        rand_time,
        case when rand_status = 'completed' then 'completed' else 'scheduled' end,
        'Jadwal konsultasi virtual dikonfirmasi.'
      );
    end if;

    -- Seed transactions (linking to the consultations)
    -- We will create multiple transactions for some consultations to simulate payment flow (failed -> paid)
    rand_method := p_methods[floor(random() * array_length(p_methods, 1) + 1)::int];
    rand_pstatus := 'paid';
    if rand_status = 'pending' then
      rand_pstatus := 'pending';
    elsif rand_status = 'cancelled' then
      rand_pstatus := 'failed';
    elsif rand_status = 'expired' then
      rand_pstatus := 'expired';
    end if;

    -- Main transaction
    insert into public.transactions (consultation_id, toliver_id, amount, admin_fee, tax_amount, platform_fee, total_amount, method, provider, status, paid_at, external_reference, created_at)
    values (
      consultation_id,
      cid,
      rand_price,
      5000,
      (rand_price * 0.11)::int,
      (rand_price * 0.10)::int,
      rand_price + 5000 + (rand_price * 0.11)::int,
      rand_method,
      'Midtrans',
      rand_pstatus,
      case when rand_pstatus = 'paid' then (rand_date + rand_time - interval '1 hour 45 minutes')::timestamptz else null end,
      'PAY-' || encode(gen_random_bytes(12), 'hex'),
      (rand_date + rand_time - interval '2 hours')::timestamptz
    );

    -- Extra transaction failures to hit exactly 800 total transactions (800 - 500 = 300 extra)
    if i <= 300 then
      insert into public.transactions (consultation_id, toliver_id, amount, admin_fee, tax_amount, platform_fee, total_amount, method, provider, status, paid_at, external_reference, created_at)
      values (
        consultation_id,
        cid,
        rand_price,
        5000,
        (rand_price * 0.11)::int,
        (rand_price * 0.10)::int,
        rand_price + 5000 + (rand_price * 0.11)::int,
        p_methods[floor(random() * 3 + 1)::int],
        'Midtrans',
        'failed',
        null,
        'PAY-ERR-' || encode(gen_random_bytes(12), 'hex'),
        (rand_date + rand_time - interval '2 hours 15 minutes')::timestamptz
      );
    end if;
  end loop;

  -- 7e. Seed 1000 Reviews
  -- To support 1000 reviews over 500 consultations, some lawyers/consultations get multiple entries
  for i in 1..1000 loop
    lid := lawyer_ids[floor(random() * array_length(lawyer_ids, 1) + 1)::int];
    cid := toliver_ids[floor(random() * array_length(toliver_ids, 1) + 1)::int];
    
    -- Pick a random consultation for this lawyer (optional but let's try to link)
    select id into consultation_id from public.consultations where lawyer_id = lid limit 1;

    rand_rating := floor(random() * 2 + 4)::int; -- 4 or 5 rating
    if random() > 0.85 then
      rand_rating := 3;
    end if;

    insert into public.reviews (consultation_id, toliver_id, lawyer_id, rating, comment, created_at)
    values (
      consultation_id,
      cid,
      lid,
      rand_rating,
      review_comments[floor(random() * array_length(review_comments, 1) + 1)::int],
      current_date - floor(random() * 60)::int
    );
  end loop;

  -- 7f. Update lawyer ratings & review counts in lawyers table based on reviews
  update public.lawyers l
  set 
    rating = coalesce((select avg(rating)::numeric(3,2) from public.reviews r where r.lawyer_id = l.id), 4.5),
    review_count = (select count(*) from public.reviews r where r.lawyer_id = l.id);

end $$;
