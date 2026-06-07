-- Migration: 021_file_management_and_rusdi_rag.sql
-- Centralized file storage, AI RAG pipeline tables, indexes, and integrity rules.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  stored_name text not null,
  extension text,
  mime_type text not null,
  file_size bigint not null default 0,
  storage_path text not null,
  public_url text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'active',
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lawyer_documents (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  document_type text not null default 'certificate',
  created_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  document_type text not null default 'identity',
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  attachment_type text not null default 'payment_proof',
  created_at timestamptz not null default now()
);

create table if not exists public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  media_type text not null default 'avatar',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_files (
  id uuid primary key default gen_random_uuid(),
  audit_log_id uuid references public.audit_logs(id) on delete set null,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_file_analysis (
  id uuid primary key default gen_random_uuid(),
  file_upload_id uuid not null references public.ai_file_uploads(id) on delete cascade,
  summary text,
  legal_issues jsonb not null default '[]'::jsonb,
  suggested_categories jsonb not null default '[]'::jsonb,
  suggested_lawyer_specializations jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) not null default 0.000,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_document_chunks (
  id uuid primary key default gen_random_uuid(),
  file_upload_id uuid references public.ai_file_uploads(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  token_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.ai_document_chunks(id) on delete cascade,
  embedding jsonb not null,
  model text not null default 'text-embedding-local',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  analysis_type text not null,
  input_summary text,
  output_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.consultation_documents
  add column if not exists file_id uuid references public.files(id) on delete set null;

alter table public.ai_file_uploads
  add column if not exists file_id uuid references public.files(id) on delete set null,
  add column if not exists analysis_status text not null default 'pending';

create index if not exists idx_files_entity on public.files(entity_type, entity_id);
create index if not exists idx_files_uploaded_by on public.files(uploaded_by);
create index if not exists idx_files_status on public.files(status);
create index if not exists idx_consultations_toliver on public.consultations(toliver_id, status);
create index if not exists idx_consultations_lawyer on public.consultations(lawyer_id, status);
create index if not exists idx_transactions_toliver on public.transactions(toliver_id, status);
create index if not exists idx_transactions_consultation on public.transactions(consultation_id);
create index if not exists idx_reviews_lawyer on public.reviews(lawyer_id, created_at desc);
create index if not exists idx_reviews_consultation on public.reviews(consultation_id);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id, created_at);
create index if not exists idx_ai_conversations_user on public.ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_document_chunks_conversation on public.ai_document_chunks(conversation_id, chunk_index);
create index if not exists idx_ai_analysis_history_user on public.ai_analysis_history(user_id, created_at desc);

alter table public.files enable row level security;
alter table public.lawyer_documents enable row level security;
alter table public.client_documents enable row level security;
alter table public.transaction_attachments enable row level security;
alter table public.ai_file_analysis enable row level security;
alter table public.ai_document_chunks enable row level security;
alter table public.ai_embeddings enable row level security;
alter table public.ai_analysis_history enable row level security;

create policy "files owner or admin" on public.files for all
  using (uploaded_by = auth.uid() or public.is_admin());

create policy "lawyer docs access" on public.lawyer_documents for select using (true);
create policy "client docs owner" on public.client_documents for all
  using (client_id = auth.uid() or public.is_admin());
create policy "transaction attachments access" on public.transaction_attachments for select
  using (public.is_admin() or exists (
    select 1 from public.transactions t where t.id = transaction_id and t.toliver_id = auth.uid()
  ));
create policy "ai analysis owner" on public.ai_file_analysis for all using (public.is_admin() or exists (
  select 1 from public.ai_file_uploads f
  join public.ai_conversations c on c.id = f.conversation_id
  where f.id = file_upload_id and c.user_id = auth.uid()
));
create policy "ai chunks owner" on public.ai_document_chunks for all using (public.is_admin() or exists (
  select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
));
create policy "ai embeddings owner" on public.ai_embeddings for all using (public.is_admin() or exists (
  select 1 from public.ai_document_chunks ch
  join public.ai_conversations c on c.id = ch.conversation_id
  where ch.id = chunk_id and c.user_id = auth.uid()
));
create policy "ai analysis history owner" on public.ai_analysis_history for all
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.search_ai_document_chunks(search_query text, max_results int default 5)
returns table(id uuid, content text, rank real) as $$
begin
  return query
  select ch.id, ch.content,
    ts_rank(to_tsvector('simple', ch.content), websearch_to_tsquery('simple', search_query)) as rank
  from public.ai_document_chunks ch
  where to_tsvector('simple', ch.content) @@ websearch_to_tsquery('simple', search_query)
  order by rank desc
  limit max_results;
end;
$$ language plpgsql security definer;

notify pgrst, 'reload schema';
