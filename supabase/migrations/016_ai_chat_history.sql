-- Migration to create the ai_chat_history table for storing AI chatbot conversations.
create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  timestamp timestamptz not null default now()
);

-- Enable RLS
alter table public.ai_chat_history enable row level security;

-- Policies
create policy "Users can select their own AI chats"
on public.ai_chat_history for select
using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert their own AI chats"
on public.ai_chat_history for insert
with check (user_id = auth.uid());

create policy "Users can delete their own AI chats"
on public.ai_chat_history for delete
using (user_id = auth.uid() or public.is_admin());
