-- Avoid evaluating auth.uid() once per row in the audit INSERT policy.
drop policy if exists "Admin registra auditoria" on public.auditoria_admin;
create policy "Admin registra auditoria"
on public.auditoria_admin
for insert
to authenticated
with check (ator_id = (select auth.uid()));
