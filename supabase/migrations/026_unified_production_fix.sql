-- Migration: 026_unified_production_fix.sql
-- Idempotent fixes for both schema paths (app_payments table OR transactions + view).

-- payment_status enum extensions (Path A)
do $$ begin alter type payment_status add value if not exists 'waiting_payment'; exception when others then null; end $$;
do $$ begin alter type payment_status add value if not exists 'waiting_verification'; exception when others then null; end $$;
do $$ begin alter type payment_status add value if not exists 'rejected'; exception when others then null; end $$;

-- AI tables
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  timestamp timestamptz not null default now()
);

alter table public.ai_conversations add column if not exists is_archived boolean not null default false;
alter table public.ai_conversations add column if not exists updated_at timestamptz not null default now();

-- Path A: app_payments is a physical table
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_payments' and c.relkind = 'r'
  ) then
    alter table public.app_payments
      add column if not exists payment_sub_method text,
      add column if not exists invoice_number text,
      add column if not exists payment_reference text,
      add column if not exists payment_proof_url text,
      add column if not exists proof_uploaded_at timestamptz,
      add column if not exists due_date timestamptz,
      add column if not exists verified_by uuid references public.profiles(id) on delete set null,
      add column if not exists verified_at timestamptz,
      add column if not exists rejection_reason text;
  end if;
end $$;

-- Path B: transactions table + app_payments view
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'transactions'
  ) then
    alter table public.transactions
      add column if not exists payment_sub_method text,
      add column if not exists due_date timestamptz,
      add column if not exists payment_reference text,
      add column if not exists verified_by uuid references public.profiles(id) on delete set null,
      add column if not exists verified_at timestamptz,
      add column if not exists rejection_reason text,
      add column if not exists proof_uploaded_at timestamptz,
      add column if not exists invoice_number text,
      add column if not exists payment_proof_url text;

    create index if not exists idx_transactions_status on public.transactions(status, created_at desc);
    create index if not exists idx_transactions_invoice on public.transactions(invoice_number);
  end if;
end $$;

-- Recreate app_payments view when transactions exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'transactions'
  ) then
    execute $view$
      create or replace view public.app_payments as
      select
        t.id,
        t.consultation_id,
        t.client_id,
        t.amount,
        t.admin_fee,
        t.tax_amount,
        t.platform_fee,
        t.total_amount,
        t.method,
        t.payment_sub_method,
        t.provider,
        t.status::text as status,
        t.invoice_number,
        t.payment_reference,
        t.payment_proof_url,
        t.proof_uploaded_at,
        t.due_date,
        t.verified_by,
        t.verified_at,
        t.rejection_reason,
        t.paid_at,
        t.external_reference,
        t.created_at,
        t.updated_at
      from public.transactions t
    $view$;
  end if;
end $$;

create table if not exists public.payment_method_configs (
  id uuid primary key default gen_random_uuid(),
  method_type text not null check (method_type in ('bank_transfer', 'ewallet', 'qris')),
  provider_code text not null,
  display_name text not null,
  account_name text,
  account_number text,
  phone_number text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (method_type, provider_code)
);

create table if not exists public.payment_verification_logs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Add FK if transactions exists and FK missing
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'transactions')
     and not exists (
       select 1 from information_schema.table_constraints
       where constraint_schema = 'public'
         and table_name = 'payment_verification_logs'
         and constraint_type = 'FOREIGN KEY'
         and constraint_name like '%transaction_id%'
     ) then
    alter table public.payment_verification_logs
      add constraint payment_verification_logs_transaction_id_fkey
      foreign key (transaction_id) references public.transactions(id) on delete cascade;
  end if;
end $$;

-- Widen verification log constraints for auto-verify
alter table public.payment_verification_logs drop constraint if exists payment_verification_logs_actor_role_check;
alter table public.payment_verification_logs
  add constraint payment_verification_logs_actor_role_check
  check (actor_role in ('lawyer', 'admin', 'client', 'system'));

alter table public.payment_verification_logs drop constraint if exists payment_verification_logs_action_check;
alter table public.payment_verification_logs
  add constraint payment_verification_logs_action_check
  check (action in ('approved', 'rejected', 'override_approved', 'override_rejected', 'proof_submitted', 'auto_verified'));

create index if not exists idx_ai_conversations_user on public.ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_ai_chat_history_user on public.ai_chat_history(user_id, timestamp desc);
create index if not exists idx_app_payments_consultation on public.app_payments(consultation_id, created_at desc);
create index if not exists idx_payment_verification_logs_tx on public.payment_verification_logs(transaction_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_chat_history enable row level security;
alter table public.payment_method_configs enable row level security;
alter table public.payment_verification_logs enable row level security;

drop policy if exists "Users manage own ai conversations" on public.ai_conversations;
create policy "Users manage own ai conversations" on public.ai_conversations for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage own ai messages" on public.ai_messages;
create policy "Users manage own ai messages" on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin())));

drop policy if exists "Users manage own ai chat history" on public.ai_chat_history;
create policy "Users manage own ai chat history" on public.ai_chat_history for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Anyone can read active payment methods" on public.payment_method_configs;
create policy "Anyone can read active payment methods" on public.payment_method_configs for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admin manages payment methods" on public.payment_method_configs;
create policy "Admin manages payment methods" on public.payment_method_configs for all
  using (public.is_admin());

drop policy if exists "Participants read verification logs" on public.payment_verification_logs;
create policy "Participants read verification logs" on public.payment_verification_logs for select
  using (
    public.is_admin()
    or actor_id = auth.uid()
    or exists (
      select 1 from public.transactions t
      join public.consultations c on c.id = t.consultation_id
      where t.id = transaction_id
        and (t.client_id = auth.uid() or c.lawyer_id = auth.uid())
    )
    or exists (
      select 1 from public.app_payments p
      join public.app_consultations c on c.id = p.consultation_id
      where p.id = transaction_id
        and (p.client_id = auth.uid() or c.lawyer_id = auth.uid())
    )
  );

drop policy if exists "System insert verification logs" on public.payment_verification_logs;
create policy "System insert verification logs" on public.payment_verification_logs for insert
  with check (true);

insert into public.payment_method_configs (method_type, provider_code, display_name, account_name, account_number, phone_number, sort_order)
values
  ('bank_transfer', 'bca', 'BCA', 'PT FinPro Legal Indonesia', '1234567890', null, 1),
  ('bank_transfer', 'bni', 'BNI', 'PT FinPro Legal Indonesia', '9876543210', null, 2),
  ('bank_transfer', 'bri', 'BRI', 'PT FinPro Legal Indonesia', '5555666677', null, 3),
  ('bank_transfer', 'mandiri', 'Mandiri', 'PT FinPro Legal Indonesia', '1122334455', null, 4),
  ('ewallet', 'gopay', 'GoPay', 'FinPro Legal', '081234567890', '081234567890', 1),
  ('ewallet', 'ovo', 'OVO', 'FinPro Legal', '081234567891', '081234567891', 2),
  ('ewallet', 'dana', 'DANA', 'FinPro Legal', '081234567892', '081234567892', 3),
  ('ewallet', 'shopeepay', 'ShopeePay', 'FinPro Legal', '081234567893', '081234567893', 4),
  ('qris', 'qris', 'QRIS Demo', 'FinPro Legal', null, null, 1)
on conflict (method_type, provider_code) do nothing;

-- Storage bucket for payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read payment proofs" on storage.objects;
create policy "Public read payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs');

drop policy if exists "Authenticated upload payment proofs" on storage.objects;
create policy "Authenticated upload payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';
