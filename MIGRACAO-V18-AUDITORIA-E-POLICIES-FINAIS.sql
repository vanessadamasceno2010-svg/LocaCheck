-- V18 - Auditoria final e organização das policies
-- Rode este arquivo no Supabase SQL Editor.
-- Objetivo: proteger logs administrativos, organizar suporte e garantir que movimentações de crédito fiquem visíveis apenas para o dono/admin.

create extension if not exists pgcrypto;

-- Função padrão para identificar admin.
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

-- ============================================================
-- 1) ACTIVITY LOGS
-- ============================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.activity_logs add column if not exists user_id uuid;
alter table public.activity_logs add column if not exists action text;
alter table public.activity_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.activity_logs add column if not exists created_at timestamptz default now();

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_action_idx on public.activity_logs (action);
create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id);

alter table public.activity_logs enable row level security;

grant select, insert on public.activity_logs to authenticated;

-- Remove policies antigas/duplicadas desta tabela e recria somente as necessárias.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_logs'
  loop
    execute format('drop policy if exists %I on public.activity_logs', p.policyname);
  end loop;
end $$;

create policy "Admins can view activity logs"
on public.activity_logs
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert activity logs"
on public.activity_logs
for insert
to authenticated
with check (public.is_admin());

-- ============================================================
-- 2) CREDIT MOVEMENTS
-- ============================================================

create table if not exists public.credit_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  movement_type text not null,
  description text,
  related_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.credit_movements add column if not exists user_id uuid;
alter table public.credit_movements add column if not exists amount integer;
alter table public.credit_movements add column if not exists movement_type text;
alter table public.credit_movements add column if not exists description text;
alter table public.credit_movements add column if not exists related_user_id uuid;
alter table public.credit_movements add column if not exists created_at timestamptz default now();

create index if not exists credit_movements_user_created_idx on public.credit_movements (user_id, created_at desc);
create index if not exists credit_movements_type_idx on public.credit_movements (movement_type);
create unique index if not exists credit_movements_referral_once_idx
on public.credit_movements (related_user_id)
where movement_type = 'referral_bonus' and related_user_id is not null;

alter table public.credit_movements enable row level security;

grant select on public.credit_movements to authenticated;

-- Remove policies antigas/duplicadas desta tabela e recria somente as necessárias.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_movements'
  loop
    execute format('drop policy if exists %I on public.credit_movements', p.policyname);
  end loop;
end $$;

create policy "Users can view own credit movements"
on public.credit_movements
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can view all credit movements"
on public.credit_movements
for select
to authenticated
using (public.is_admin());

-- Não criamos policy de insert/update/delete para usuários comuns.
-- Movimentações devem ser criadas por função segura, webhook/service role ou admin controlado.

-- ============================================================
-- 3) SUPPORT MESSAGES
-- ============================================================

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text,
  status text default 'novo',
  reply text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table public.support_messages add column if not exists user_id uuid;
alter table public.support_messages add column if not exists message text;
alter table public.support_messages add column if not exists status text default 'novo';
alter table public.support_messages add column if not exists reply text;
alter table public.support_messages add column if not exists created_at timestamptz default now();
alter table public.support_messages add column if not exists resolved_at timestamptz;

create index if not exists support_messages_user_created_idx on public.support_messages (user_id, created_at desc);
create index if not exists support_messages_status_idx on public.support_messages (status);

alter table public.support_messages enable row level security;

grant select, insert, update on public.support_messages to authenticated;

-- Remove policies antigas/duplicadas do suporte e recria políticas limpas.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
  loop
    execute format('drop policy if exists %I on public.support_messages', p.policyname);
  end loop;
end $$;

create policy "Users can view own support messages"
on public.support_messages
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create own support messages"
on public.support_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and coalesce(status, 'novo') in ('novo', 'aberto')
);

create policy "Admins can view all support messages"
on public.support_messages
for select
to authenticated
using (public.is_admin());

create policy "Admins can update support messages"
on public.support_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- 4) WEBHOOK LOGS PUSHINPAY
-- ============================================================
-- Usuário comum não deve acessar logs brutos de webhook.
-- Service role continua conseguindo gravar normalmente.

alter table public.pushinpay_webhook_logs enable row level security;

grant select on public.pushinpay_webhook_logs to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pushinpay_webhook_logs'
  loop
    execute format('drop policy if exists %I on public.pushinpay_webhook_logs', p.policyname);
  end loop;
end $$;

create policy "Admins can view webhook logs"
on public.pushinpay_webhook_logs
for select
to authenticated
using (public.is_admin());

-- ============================================================
-- 5) TESTE RÁPIDO
-- ============================================================
-- Depois de rodar, confira se retorna sucesso.
select jsonb_build_object(
  'success', true,
  'step', 'v18_auditoria_policies',
  'message', 'Auditoria e policies finais aplicadas com sucesso.'
) as resultado;
