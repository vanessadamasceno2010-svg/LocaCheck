-- V30 - Refinamento da Consulta Externa
-- Esta migração é segura e apenas reforça permissões/estrutura já criadas na V28/V29.
-- Pode ser rodada mesmo se a V29 já estiver aplicada.

alter table public.external_consultation_logs enable row level security;

drop policy if exists "Admins can view external consultation logs" on public.external_consultation_logs;
drop policy if exists "Users can view own external consultation logs" on public.external_consultation_logs;

create policy "Admins can view external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (public.is_admin());

create policy "Users can view own external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (user_id = auth.uid());

create index if not exists external_consultation_logs_created_at_idx
on public.external_consultation_logs (created_at desc);

create index if not exists external_consultation_logs_user_id_idx
on public.external_consultation_logs (user_id);

create index if not exists external_consultation_logs_type_idx
on public.external_consultation_logs (consultation_type);

create index if not exists external_consultation_logs_cache_hit_idx
on public.external_consultation_logs (cache_hit);

notify pgrst, 'reload schema';
