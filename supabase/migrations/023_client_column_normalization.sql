-- Migration: 023_client_column_normalization.sql
-- Normalize legacy toliver_id columns to client_id across runtime tables/views/policies.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultations' and column_name = 'toliver_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultations' and column_name = 'client_id'
  ) then
    alter table public.consultations rename column toliver_id to client_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'toliver_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'client_id'
  ) then
    alter table public.transactions rename column toliver_id to client_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and column_name = 'toliver_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and column_name = 'client_id'
  ) then
    alter table public.reviews rename column toliver_id to client_id;
  end if;
end $$;

do $$
declare
  has_scheduled_day boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultations' and column_name = 'scheduled_day'
  ) into has_scheduled_day;

  if has_scheduled_day then
    execute $view$
      create or replace view public.app_consultations as
      select
        c.id,
        c.client_id,
        c.lawyer_id,
        c.consultation_type,
        c.scheduled_day,
        c.scheduled_time::text as scheduled_time,
        c.status::text as status,
        c.price,
        c.notes,
        c.created_at,
        c.updated_at
      from public.consultations c
    $view$;
  else
    execute $view$
      create or replace view public.app_consultations as
      select
        c.id,
        c.client_id,
        c.lawyer_id,
        c.consultation_type,
        c.scheduled_date::text as scheduled_day,
        c.scheduled_time::text as scheduled_time,
        c.status::text as status,
        c.price,
        c.notes,
        c.created_at,
        c.updated_at
      from public.consultations c
    $view$;
  end if;
end $$;

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
  t.provider,
  t.status::text as status,
  t.paid_at,
  t.external_reference,
  t.created_at,
  t.updated_at
from public.transactions t;

create or replace view public.platform_reviews as
select
  r.id,
  r.consultation_id,
  r.client_id,
  r.lawyer_id,
  r.rating,
  r.comment,
  r.created_at,
  p.full_name as client_name,
  lp.full_name as lawyer_name,
  cat.name as category_name
from public.reviews r
join public.profiles p on p.id = r.client_id
join public.profiles lp on lp.id = r.lawyer_id
left join public.consultations con on con.id = r.consultation_id
left join public.categories cat on cat.id = con.category_id;

drop policy if exists "Allow participants select consultations" on public.consultations;
drop policy if exists "Allow participants insert consultations" on public.consultations;
drop policy if exists "Allow participants update consultations" on public.consultations;

create policy "Allow participants select consultations"
  on public.consultations for select
  using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

create policy "Allow participants insert consultations"
  on public.consultations for insert
  with check (client_id = auth.uid() or public.is_admin());

create policy "Allow participants update consultations"
  on public.consultations for update
  using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

drop policy if exists "Allow toliver write reviews" on public.reviews;
create policy "Allow client write reviews"
  on public.reviews for insert
  with check (client_id = auth.uid());

drop policy if exists "Allow toliver and admin access transactions" on public.transactions;
create policy "Allow client and admin access transactions"
  on public.transactions for all
  using (client_id = auth.uid() or public.is_admin());

create index if not exists idx_consultations_client on public.consultations(client_id, status);
create index if not exists idx_transactions_client on public.transactions(client_id, status);

notify pgrst, 'reload schema';
