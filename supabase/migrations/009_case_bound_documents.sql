alter table if exists public.documents
drop constraint if exists documents_consultation_id_fkey;

alter table if exists public.documents
add constraint documents_consultation_id_fkey
foreign key (consultation_id)
references public.app_consultations(id)
on delete cascade;

create index if not exists documents_consultation_id_idx
on public.documents(consultation_id);

drop policy if exists "Documents owner or consultation participant access" on public.documents;

create policy "Documents owner or app consultation participant access"
on public.documents for all
using (
  owner_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = documents.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
)
with check (
  owner_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = documents.consultation_id
      and (c.client_id = auth.uid() or c.lawyer_id = auth.uid())
  )
);
