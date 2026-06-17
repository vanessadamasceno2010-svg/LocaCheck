-- V29 - Correção do painel Admin > Consulta Externa
-- Objetivo: garantir que a tabela external_consultation_logs tenha a estrutura certa,
-- permissões corretas e consiga listar no painel admin sem quebrar o site.

create table if not exists public.external_consultation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  cpf_hash text,
  cpf4 text,
  provider text default 'BigDataCorp',
  consultation_type text,
  datasets text[] default array[]::text[],
  credits_charged int default 0,
  cache_hit boolean default false,
  status text default 'success',
  result_summary jsonb default '{}'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

alter table public.external_consultation_logs add column if not exists user_id uuid;
alter table public.external_consultation_logs add column if not exists cpf_hash text;
alter table public.external_consultation_logs add column if not exists cpf4 text;
alter table public.external_consultation_logs add column if not exists provider text default 'BigDataCorp';
alter table public.external_consultation_logs add column if not exists consultation_type text;
alter table public.external_consultation_logs add column if not exists datasets text[] default array[]::text[];
alter table public.external_consultation_logs add column if not exists credits_charged int default 0;
alter table public.external_consultation_logs add column if not exists cache_hit boolean default false;
alter table public.external_consultation_logs add column if not exists status text default 'success';
alter table public.external_consultation_logs add column if not exists result_summary jsonb default '{}'::jsonb;
alter table public.external_consultation_logs add column if not exists raw_response jsonb default '{}'::jsonb;
alter table public.external_consultation_logs add column if not exists error_message text;
alter table public.external_consultation_logs add column if not exists created_at timestamptz default now();

-- Se a coluna datasets tiver sido criada como jsonb em alguma tentativa anterior,
-- converte para text[] de forma segura, que é o formato usado pelo app.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'external_consultation_logs'
      and column_name = 'datasets'
      and data_type = 'jsonb'
  ) then
    alter table public.external_consultation_logs
    alter column datasets type text[]
    using (
      case
        when datasets is null then array[]::text[]
        else array(select jsonb_array_elements_text(datasets))
      end
    );
  end if;
end $$;

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

create index if not exists external_consultation_logs_cache_idx
on public.external_consultation_logs (cache_hit);

-- Copia para a tabela correta as consultas externas que já ficaram registradas na auditoria.
insert into public.external_consultation_logs (
  user_id,
  cpf4,
  provider,
  consultation_type,
  datasets,
  credits_charged,
  cache_hit,
  status,
  result_summary,
  created_at
)
select
  a.user_id,
  a.details->>'cpf4',
  'BigDataCorp',
  coalesce(a.details->>'consultation_type', 'external'),
  case
    when a.details ? 'datasets' then array(select jsonb_array_elements_text(a.details->'datasets'))
    else array[]::text[]
  end,
  coalesce((a.details->>'credits_charged')::int, 0),
  coalesce((a.details->>'cache_hit')::boolean, false),
  'success',
  coalesce(a.details, '{}'::jsonb),
  a.created_at
from public.activity_logs a
where a.action = 'external_consultation_completed'
  and not exists (
    select 1
    from public.external_consultation_logs e
    where e.created_at = a.created_at
      and e.user_id = a.user_id
      and coalesce(e.cpf4, '') = coalesce(a.details->>'cpf4', '')
  );

notify pgrst, 'reload schema';
