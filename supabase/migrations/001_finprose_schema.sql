create extension if not exists "pgcrypto";

do $$
begin
  create type app_role as enum ('client', 'lawyer', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type account_status as enum ('active', 'pending_verification', 'suspended', 'blocked');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type consultation_status as enum ('pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role app_role not null default 'client',
  status account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  address text,
  identity_number text,
  date_of_birth date,
  emergency_contact text
);

create table if not exists public.legal_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.lawyer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  specialty text not null,
  description text,
  experience_years int not null default 0,
  consultation_price int not null default 150000,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  is_online boolean not null default false,
  verification_status verification_status not null default 'pending'
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  lawyer_id uuid not null references public.lawyer_profiles(user_id),
  category_id uuid references public.legal_categories(id),
  consultation_type text not null default 'chat',
  meeting_mode text not null default 'virtual',
  scheduled_date date,
  scheduled_time time,
  duration_minutes int not null default 60,
  status consultation_status not null default 'pending',
  price int not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id),
  client_id uuid not null references public.profiles(id),
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

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  consultation_id uuid references public.consultations(id),
  name text not null,
  file_url text not null,
  file_type text,
  file_size int,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id),
  client_id uuid not null references public.profiles(id),
  lawyer_id uuid not null references public.profiles(id),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text,
  attachment_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.lawyer_profiles enable row level security;
alter table public.legal_categories enable row level security;
alter table public.consultations enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Profiles readable by owner or admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Profiles insertable by owner"
on public.profiles for insert
with check (id = auth.uid());

create policy "Profiles updateable by owner or admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Client profile owner access"
on public.client_profiles for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Verified lawyers publicly readable"
on public.lawyer_profiles for select
using (verification_status = 'verified' or user_id = auth.uid() or public.is_admin());

create policy "Lawyer profile owner writes"
on public.lawyer_profiles for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Categories readable by everyone"
on public.legal_categories for select
using (true);

create policy "Consultations participant access"
on public.consultations for all
using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

create policy "Payments client or admin access"
on public.payments for all
using (client_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or public.is_admin());

create policy "Documents owner or consultation participant access"
on public.documents for all
using (
  owner_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.consultations c
    where c.id = documents.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
)
with check (
  owner_id = auth.uid()
  or public.is_admin()
);

create policy "Chat session participant access"
on public.chat_sessions for all
using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

create policy "Messages participant access"
on public.messages for all
using (
  sender_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.chat_sessions s
    where s.id = messages.chat_session_id
      and (s.client_id = auth.uid() or s.lawyer_id = auth.uid())
  )
)
with check (
  sender_id = auth.uid()
  or public.is_admin()
);

insert into public.legal_categories (name, description) values
  ('Perceraian', 'Mediasi dan pendampingan hukum keluarga.'),
  ('Bisnis/Kontrak', 'Penyusunan dan tinjauan legalitas bisnis.'),
  ('Pidana', 'Pembelaan hukum pidana.'),
  ('Perdata', 'Sengketa tanah, hutang, dan wanprestasi.'),
  ('Ketenagakerjaan', 'Sengketa PHK dan kontrak kerja.'),
  ('Pajak', 'Konsultasi audit dan kepatuhan perpajakan.'),
  ('Hak Waris', 'Pembagian aset dan sengketa waris.')
on conflict (name) do nothing;
