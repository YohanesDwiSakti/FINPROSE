-- Migration: 024_manual_payment_system.sql
-- Manual payment workflow: bank transfer, e-wallet, QRIS with lawyer/admin verification.

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
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null check (actor_role in ('lawyer', 'admin', 'client')),
  action text not null check (action in ('approved', 'rejected', 'override_approved', 'override_rejected', 'proof_submitted')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_status on public.transactions(status, created_at desc);
create index if not exists idx_transactions_invoice on public.transactions(invoice_number);
create index if not exists idx_payment_verification_logs_tx on public.payment_verification_logs(transaction_id, created_at desc);

alter table public.payment_method_configs enable row level security;
alter table public.payment_verification_logs enable row level security;

create policy "Anyone can read active payment methods"
  on public.payment_method_configs for select
  using (is_active = true or public.is_admin());

create policy "Admin manages payment methods"
  on public.payment_method_configs for all
  using (public.is_admin());

create policy "Participants read verification logs"
  on public.payment_verification_logs for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.transactions t
      join public.consultations c on c.id = t.consultation_id
      where t.id = transaction_id
        and (t.client_id = auth.uid() or c.lawyer_id = auth.uid())
    )
  );

create policy "Lawyer or admin insert verification logs"
  on public.payment_verification_logs for insert
  with check (public.is_admin() or actor_id = auth.uid());

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

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultations' and column_name = 'scheduled_day'
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
  else
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

notify pgrst, 'reload schema';
