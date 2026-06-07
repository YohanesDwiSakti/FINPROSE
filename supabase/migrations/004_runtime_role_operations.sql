drop policy if exists "App consultations participant access" on public.app_consultations;

create policy "App consultations participant access"
on public.app_consultations for all
using (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
)
with check (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "App payments participant access" on public.app_payments;

create policy "App payments participant access"
on public.app_payments for all
using (
  client_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.app_consultations c
    where c.id = app_payments.consultation_id
      and c.lawyer_id = auth.uid()
  )
)
with check (
  client_id = auth.uid()
  or public.is_admin()
);
