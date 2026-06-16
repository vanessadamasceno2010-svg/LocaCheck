-- =============================================================
-- LocaCheck V28 — Consulta Externa BigDataCorp
-- Cria cache seguro, logs de consulta externa e permissões RLS.
-- Rode no Supabase > SQL Editor > New query > Run.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.external_consultation_cache (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text not null,
  cpf4 text,
  consultation_type text not null check (consultation_type in ('external_basic', 'external_complete')),
  datasets text[] default array[]::text[],
  result_summary jsonb default '{}'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cpf_hash, consultation_type)
);

create table if not exists public.external_consultation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  cpf_hash text,
  cpf4 text,
  provider text default 'BigDataCorp',
  consultation_type text not null check (consultation_type in ('external_basic', 'external_complete')),
  datasets text[] default array[]::text[],
  credits_charged integer default 0,
  cache_hit boolean default false,
  status text default 'success',
  result_summary jsonb default '{}'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists external_consultation_cache_lookup_idx
on public.external_consultation_cache (cpf_hash, consultation_type, expires_at desc);

create index if not exists external_consultation_logs_user_created_idx
on public.external_consultation_logs (user_id, created_at desc);

create index if not exists external_consultation_logs_type_created_idx
on public.external_consultation_logs (consultation_type, created_at desc);

create index if not exists external_consultation_logs_cpf4_idx
on public.external_consultation_logs (cpf4);

alter table public.external_consultation_cache enable row level security;
alter table public.external_consultation_logs enable row level security;

grant select on public.external_consultation_logs to authenticated;
grant select on public.external_consultation_cache to authenticated;

-- Função admin segura, caso ainda não exista.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Remove policies antigas dessas tabelas para evitar conflito.
do $$
declare p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('external_consultation_cache', 'external_consultation_logs')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Cache: somente admin visualiza pelo cliente; escrita deve ser feita pela service_role na API.
create policy "Admins can view external cache"
on public.external_consultation_cache
for select
to authenticated
using (public.is_admin());

-- Logs: usuário vê apenas os próprios logs; admin vê todos.
create policy "Users can view own external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can view all external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (public.is_admin());

-- Garante colunas necessárias em tabelas auxiliares.
alter table public.activity_logs add column if not exists user_id uuid;
alter table public.activity_logs add column if not exists action text;
alter table public.activity_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.activity_logs add column if not exists created_at timestamptz default now();

alter table public.credit_movements add column if not exists user_id uuid;
alter table public.credit_movements add column if not exists amount integer;
alter table public.credit_movements add column if not exists movement_type text;
alter table public.credit_movements add column if not exists description text;
alter table public.credit_movements add column if not exists created_at timestamptz default now();

create index if not exists activity_logs_action_created_idx on public.activity_logs (action, created_at desc);
create index if not exists credit_movements_external_idx on public.credit_movements (movement_type, created_at desc);

-- Comentários úteis para documentação interna.
comment on table public.external_consultation_cache is 'Cache seguro de consultas externas BigDataCorp para reduzir chamadas repetidas e custo por CPF.';
comment on table public.external_consultation_logs is 'Auditoria de consultas externas realizadas pelos usuários da LocaCheck.';
comment on column public.external_consultation_logs.raw_response is 'Retorno bruto da BigDataCorp. Exibir apenas para admin/autoria, nunca diretamente para usuário comum.';
