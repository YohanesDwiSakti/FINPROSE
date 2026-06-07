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

create index if not exists app_messages_chat_session_created_idx
on public.app_messages(chat_session_id, created_at);

alter table public.app_chat_sessions enable row level security;
alter table public.app_messages enable row level security;

drop policy if exists "App chat session participant access" on public.app_chat_sessions;

create policy "App chat session participant access"
on public.app_chat_sessions for all
using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

drop policy if exists "App messages participant access" on public.app_messages;

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
  public.is_admin()
  or sender_id = auth.uid()
  or exists (
    select 1
    from public.app_chat_sessions s
    where s.id = app_messages.chat_session_id
      and (s.client_id = auth.uid() or s.lawyer_id = auth.uid())
  )
);
