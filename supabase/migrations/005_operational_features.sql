create table if not exists public.app_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.app_consultations(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  lawyer_id uuid not null references public.lawyer_directory(id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consultation_id)
);

create table if not exists public.app_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.app_chat_sessions(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text not null default 'client',
  content text,
  attachment_url text,
  attachment_name text,
  attachment_size int,
  message_type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.app_consultations(id) on delete set null,
  client_id uuid references public.profiles(id) on delete set null,
  lawyer_id uuid not null references public.lawyer_directory(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (consultation_id, client_id)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_status_logs (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.app_consultations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  old_status consultation_status,
  new_status consultation_status not null,
  note text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-documents',
  'legal-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'audio/mpeg'
  ]
)
on conflict (id) do nothing;

alter table public.app_chat_sessions enable row level security;
alter table public.app_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.support_tickets enable row level security;
alter table public.consultation_status_logs enable row level security;

create policy "App chat session participant access"
on public.app_chat_sessions for all
using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

create policy "App messages participant access"
on public.app_messages for all
using (
  public.is_admin()
  or sender_id = auth.uid()
  or exists (
    select 1
    from public.app_chat_sessions s
    where s.id = app_messages.chat_session_id
      and (s.client_id = auth.uid() or s.lawyer_id = auth.uid())
  )
)
with check (
  sender_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.app_chat_sessions s
    where s.id = app_messages.chat_session_id
      and (s.client_id = auth.uid() or s.lawyer_id = auth.uid())
  )
);

create policy "Reviews readable by everyone"
on public.reviews for select
using (true);

create policy "Reviews insertable by client"
on public.reviews for insert
with check (client_id = auth.uid() or public.is_admin());

create policy "Support tickets owner or admin"
on public.support_tickets for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Consultation logs participant read"
on public.consultation_status_logs for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = consultation_status_logs.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
);

create policy "Consultation logs participant insert"
on public.consultation_status_logs for insert
with check (
  public.is_admin()
  or actor_id = auth.uid()
);

create policy "Legal documents owner upload"
on storage.objects for insert
with check (
  bucket_id = 'legal-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Legal documents owner read"
on storage.objects for select
using (
  bucket_id = 'legal-documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "Legal documents owner update"
on storage.objects for update
using (
  bucket_id = 'legal-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Legal documents owner delete"
on storage.objects for delete
using (
  bucket_id = 'legal-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
