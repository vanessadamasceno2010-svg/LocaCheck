-- V32 - Consulta Externa Avançada
-- Migração leve: não muda a estrutura principal. Apenas reforça índices usados pela consulta externa.

create index if not exists idx_external_consultation_logs_type_created
on public.external_consultation_logs (consultation_type, created_at desc);

create index if not exists idx_external_consultation_logs_user_created
on public.external_consultation_logs (user_id, created_at desc);

create index if not exists idx_external_consultation_cache_type_expires
on public.external_consultation_cache (consultation_type, expires_at desc);

notify pgrst, 'reload schema';
