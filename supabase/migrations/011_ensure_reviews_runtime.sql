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

create table if not exists public.consultation_status_logs (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.app_consultations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  old_status consultation_status,
  new_status consultation_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_lawyer_created_idx
on public.reviews(lawyer_id, created_at desc);

create index if not exists consultation_status_logs_consultation_created_idx
on public.consultation_status_logs(consultation_id, created_at desc);

alter table public.reviews enable row level security;
alter table public.consultation_status_logs enable row level security;

drop policy if exists "Reviews readable by everyone" on public.reviews;
create policy "Reviews readable by everyone"
on public.reviews for select
using (true);

drop policy if exists "Reviews insertable by client" on public.reviews;
create policy "Reviews insertable by client"
on public.reviews for insert
with check (client_id = auth.uid() or public.is_admin());

drop policy if exists "Reviews updateable by client" on public.reviews;
create policy "Reviews updateable by client"
on public.reviews for update
using (client_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or public.is_admin());

drop policy if exists "Consultation logs participant read" on public.consultation_status_logs;
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

drop policy if exists "Consultation logs participant insert" on public.consultation_status_logs;
create policy "Consultation logs participant insert"
on public.consultation_status_logs for insert
with check (
  public.is_admin()
  or actor_id = auth.uid()
);

notify pgrst, 'reload schema';
