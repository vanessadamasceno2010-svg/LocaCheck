-- LocaCheck V46
-- Execute no Supabase: SQL Editor > New query > cole todo o arquivo > Run.
-- Esta migração não altera PushinPay, planos, usuários ou o bucket records.

alter table public.external_consultation_cache
  add column if not exists search_type text,
  add column if not exists search_value text,
  add column if not exists search_hash text;

alter table public.external_consultation_logs
  add column if not exists search_type text,
  add column if not exists search_value text,
  add column if not exists search_hash text;

update public.external_consultation_cache
set search_type = coalesce(search_type, 'cpf'),
    search_hash = coalesce(search_hash, cpf_hash)
where search_type is null or search_hash is null;

update public.external_consultation_logs
set search_type = coalesce(search_type, 'cpf'),
    search_value = coalesce(search_value, cpf_full),
    search_hash = coalesce(search_hash, cpf_hash)
where search_type is null or search_hash is null;

create index if not exists external_cache_search_v46_idx
on public.external_consultation_cache (search_hash, consultation_type, expires_at desc);

create index if not exists external_logs_search_v46_idx
on public.external_consultation_logs (search_type, search_hash, created_at desc);

create table if not exists public.process_consultation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  process_number text not null,
  process_hash text not null,
  credits_charged integer not null default 0,
  credits_balance_after integer,
  status text not null default 'success',
  result_summary jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.process_consultation_logs enable row level security;

drop policy if exists "Users can view own process consultation logs" on public.process_consultation_logs;
create policy "Users can view own process consultation logs"
on public.process_consultation_logs for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

revoke insert, update, delete on public.process_consultation_logs from anon, authenticated;
grant select on public.process_consultation_logs to authenticated;

create or replace function public.consume_user_credits_v46(
  p_user_id uuid,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'message', 'Dados de cobrança inválidos.');
  end if;

  update public.profiles
  set credits = credits - p_amount,
      consultas = coalesce(consultas, 0) + 1
  where id = p_user_id
    and coalesce(credits, 0) >= p_amount
  returning credits into v_balance;

  if v_balance is null then
    return jsonb_build_object('success', false, 'message', 'Créditos insuficientes.');
  end if;

  return jsonb_build_object('success', true, 'balance_after', v_balance);
end;
$$;

revoke all on function public.consume_user_credits_v46(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_user_credits_v46(uuid, integer) to service_role;

comment on column public.external_consultation_logs.search_value is
'Valor pesquisado pelo usuário. Na V46 pode conter CPF, telefone ou e-mail completo e deve ser acessível somente conforme as políticas administrativas.';

