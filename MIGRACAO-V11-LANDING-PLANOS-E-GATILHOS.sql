-- V11 - Landing pública com planos dinâmicos e números de credibilidade
-- Rode no Supabase > SQL Editor antes de subir a versão v11.

-- Garante que a tabela plans possui os campos usados pelo site.
alter table public.plans add column if not exists price_cents integer;
alter table public.plans add column if not exists active boolean default true;
alter table public.plans add column if not exists is_unlimited boolean default false;
alter table public.plans add column if not exists duration_days integer default 0;

-- Completa dados antigos quando existirem apenas price/plan_type.
update public.plans
set price_cents = round(coalesce(price, 0) * 100)::integer
where (price_cents is null or price_cents = 0)
  and price is not null;

update public.plans
set is_unlimited = true,
    duration_days = case when coalesce(duration_days, 0) <= 0 then 30 else duration_days end,
    plan_type = 'unlimited'
where lower(coalesce(plan_type, '')) = 'unlimited'
   or lower(coalesce(name, '')) like '%ilimit%';

update public.plans
set active = true
where active is null;

alter table public.plans enable row level security;

-- Permite que a página inicial, ainda sem login, mostre apenas os planos ativos.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Public can view active plans'
  ) then
    create policy "Public can view active plans"
    on public.plans
    for select
    to anon, authenticated
    using (active is true);
  end if;
end $$;

-- Função pública de números da landing.
-- Ela devolve apenas totais agregados, sem expor CPF, nomes, pagamentos ou dados pessoais.
create or replace function public.public_landing_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users integer := 0;
  v_approved_records integer := 0;
  v_monthly_consultations integer := 0;
  v_daily_consultations integer := 0;
begin
  select count(*)::integer
    into v_total_users
  from public.profiles;

  select count(*)::integer
    into v_approved_records
  from public.records
  where lower(coalesce(status, '')) = 'aprovado';

  select count(*)::integer
    into v_monthly_consultations
  from public.consultation_logs
  where created_at >= now() - interval '30 days';

  select count(*)::integer
    into v_daily_consultations
  from public.consultation_logs
  where created_at >= date_trunc('day', now());

  return jsonb_build_object(
    'total_users', coalesce(v_total_users, 0),
    'approved_records', coalesce(v_approved_records, 0),
    'monthly_consultations', coalesce(v_monthly_consultations, 0),
    'daily_consultations', coalesce(v_daily_consultations, 0)
  );
end;
$$;

revoke all on function public.public_landing_stats() from public;
grant execute on function public.public_landing_stats() to anon, authenticated;
