-- Migration: 022_ai_conversation_archive.sql
-- Adds archive support and indexes for Rusdi conversation history sidebar.

alter table public.ai_conversations
  add column if not exists is_archived boolean not null default false;

create index if not exists idx_ai_conversations_user_active
  on public.ai_conversations (user_id, is_archived, updated_at desc);

create index if not exists idx_ai_messages_conversation_created
  on public.ai_messages (conversation_id, created_at asc);
