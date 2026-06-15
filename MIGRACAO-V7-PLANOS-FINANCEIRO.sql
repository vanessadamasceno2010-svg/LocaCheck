-- LocaCheck v7
-- Correções para: Gerenciar Planos no admin, créditos nos pagamentos e nome do usuário nos pagamentos recentes.
-- Rode este arquivo no Supabase > SQL Editor > New query > Run.

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

-- 1) Completa a tabela plans com os campos que o painel admin usa.
alter table public.plans add column if not exists price_cents integer;
alter table public.plans add column if not exists is_unlimited boolean default false;
alter table public.plans add column if not exists duration_days integer default 0;
alter table public.plans add column if not exists active boolean default true;
alter table public.plans add column if not exists created_at timestamptz default now();

-- Mantém compatibilidade com o formato antigo, onde existia price em reais e plan_type.
update public.plans
set price_cents = round(coalesce(price, 0) * 100)::integer
where price_cents is null
  and price is not null;

update public.plans
set is_unlimited = true
where coalesce(is_unlimited, false) = false
  and (
    lower(coalesce(plan_type, '')) = 'unlimited'
    or lower(coalesce(name, '')) like '%ilimit%'
  );

update public.plans
set duration_days = 30
where is_unlimited = true
  and coalesce(duration_days, 0) = 0;

update public.plans
set active = true
where active is null;

update public.plans
set plan_type = case when is_unlimited then 'unlimited' else 'credits' end
where plan_type is null;

-- Se o campo price existir, mantém ele sincronizado com price_cents.
update public.plans
set price = round((coalesce(price_cents, 0)::numeric / 100), 2)
where price_cents is not null;

-- 2) Garante permissões para o admin gerenciar planos.
alter table public.plans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Admins can view all plans'
  ) then
    create policy "Admins can view all plans"
    on public.plans
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Admins can insert plans'
  ) then
    create policy "Admins can insert plans"
    on public.plans
    for insert
    to authenticated
    with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Admins can update plans'
  ) then
    create policy "Admins can update plans"
    on public.plans
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Admins can delete plans'
  ) then
    create policy "Admins can delete plans"
    on public.plans
    for delete
    to authenticated
    using (public.is_admin());
  end if;
end $$;

-- 3) Preenche créditos antigos de pagamentos usando o plano vinculado.
update public.payments pay
set credits = coalesce(nullif(pay.credits, 0), pl.credits, 0),
    plan_type = coalesce(pay.plan_type, pl.plan_type, case when pl.is_unlimited then 'unlimited' else 'credits' end)
from public.plans pl
where pay.plan_id = pl.id
  and (pay.credits is null or pay.credits = 0 or pay.plan_type is null);

-- 4) Recria o dashboard financeiro para trazer nome do usuário e dados do plano.
drop function if exists public.admin_financial_dashboard();

create or replace function public.admin_financial_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object(
      'success', false,
      'message', 'Acesso negado.'
    );
  end if;

  select jsonb_build_object(
    'success', true,
    'total_revenue_cents', coalesce((
      select sum(
        case
          when amount_cents is not null then amount_cents
          when amount is null then 0
          when amount >= 100 then amount
          else round(amount * 100)::integer
        end
      )
      from public.payments
      where status = 'paid'
    ), 0),
    'paid_payments', coalesce((select count(*) from public.payments where status = 'paid'), 0),
    'pending_payments', coalesce((select count(*) from public.payments where status = 'pending'), 0),
    'failed_payments', coalesce((select count(*) from public.payments where status in ('failed', 'canceled', 'cancelled', 'expired')), 0),
    'total_credits_sold', coalesce((
      select sum(coalesce(nullif(pay.credits, 0), pl.credits, 0))
      from public.payments pay
      left join public.plans pl on pl.id = pay.plan_id
      where pay.status = 'paid'
    ), 0),
    'total_consultations', coalesce((select count(*) from public.consultation_logs), 0),
    'total_users', coalesce((select count(*) from public.profiles), 0),
    'unlimited_users', coalesce((select count(*) from public.profiles where unlimited_until > now()), 0),
    'recent_payments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rp.id,
          'user_id', rp.user_id,
          'user_name', coalesce(rp.nome, 'Usuário sem nome'),
          'user_whatsapp', rp.whatsapp,
          'status', rp.status,
          'amount', rp.amount,
          'amount_cents', rp.amount_cents_calculated,
          'credits', rp.credits_calculated,
          'plan_id', rp.plan_id,
          'plan_name', coalesce(rp.plan_name, rp.plan_type, 'Pagamento'),
          'plan_type', rp.plan_type,
          'created_at', rp.created_at,
          'paid_at', rp.paid_at,
          'processed_at', rp.processed_at
        )
        order by rp.created_at desc nulls last
      )
      from (
        select
          pay.id,
          pay.user_id,
          prof.nome,
          prof.whatsapp,
          pay.status,
          pay.amount,
          case
            when pay.amount_cents is not null then pay.amount_cents
            when pay.amount is null then 0
            when pay.amount >= 100 then pay.amount
            else round(pay.amount * 100)::integer
          end as amount_cents_calculated,
          coalesce(nullif(pay.credits, 0), pl.credits, 0) as credits_calculated,
          pay.plan_id,
          pl.name as plan_name,
          pay.plan_type,
          pay.created_at,
          pay.paid_at,
          pay.processed_at
        from public.payments pay
        left join public.profiles prof on prof.id = pay.user_id
        left join public.plans pl on pl.id = pay.plan_id
        order by pay.created_at desc nulls last
        limit 20
      ) rp
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_financial_dashboard() to authenticated;
