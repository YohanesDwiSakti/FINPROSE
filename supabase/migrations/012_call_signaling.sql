create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.app_consultations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text not null default 'client',
  signal_type text not null check (signal_type in ('offer', 'answer', 'candidate', 'leave')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_signals_consultation_created_idx
on public.call_signals(consultation_id, created_at);

alter table public.call_signals enable row level security;

drop policy if exists "Call signals participant access" on public.call_signals;
create policy "Call signals participant access"
on public.call_signals for all
using (
  public.is_admin()
  or sender_id = auth.uid()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = call_signals.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
)
with check (
  public.is_admin()
  or sender_id = auth.uid()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = call_signals.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
);

notify pgrst, 'reload schema';
