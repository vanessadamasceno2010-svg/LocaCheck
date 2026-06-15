-- LocaCheck v8
-- Ajustes para: ordenar planos por preço e permitir exclusão pelo painel admin.
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

-- Garante que os campos de preço/controle existam.
alter table public.plans add column if not exists price_cents integer;
alter table public.plans add column if not exists is_unlimited boolean default false;
alter table public.plans add column if not exists duration_days integer default 0;
alter table public.plans add column if not exists active boolean default true;
alter table public.plans add column if not exists created_at timestamptz default now();

-- Mantém price_cents preenchido para a ordenação funcionar corretamente.
update public.plans
set price_cents = round(coalesce(price, 0) * 100)::integer
where price_cents is null
  and price is not null;

update public.plans
set price = round((coalesce(price_cents, 0)::numeric / 100), 2)
where price_cents is not null;

update public.plans
set active = true
where active is null;

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
set plan_type = case when is_unlimited then 'unlimited' else 'credits' end
where plan_type is null;

-- Garante que admin possa excluir planos pelo painel.
alter table public.plans enable row level security;

do $$
begin
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
