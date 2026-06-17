-- V40 — adiciona plano de 150 créditos e garante plano ilimitado ativo
-- Rode no Supabase > SQL Editor antes/depois de subir a V40.

-- Plano 150 créditos por R$ 97,50
update public.plans
set
  name = '150 Créditos',
  credits = 150,
  price_cents = 9750,
  price = 97.50,
  plan_type = 'credits',
  is_unlimited = false,
  duration_days = 0,
  active = true,
  updated_at = now()
where lower(name) in ('150 créditos', '150 creditos')
   or credits = 150;

insert into public.plans (
  name,
  credits,
  price_cents,
  price,
  plan_type,
  is_unlimited,
  duration_days,
  active,
  created_at,
  updated_at
)
select
  '150 Créditos',
  150,
  9750,
  97.50,
  'credits',
  false,
  0,
  true,
  now(),
  now()
where not exists (
  select 1 from public.plans
  where lower(name) in ('150 créditos', '150 creditos')
     or credits = 150
);

-- Garante que o plano ilimitado volte a aparecer se existir no banco.
update public.plans
set
  active = true,
  is_unlimited = true,
  plan_type = 'unlimited',
  duration_days = coalesce(nullif(duration_days, 0), 30),
  updated_at = now()
where is_unlimited = true
   or lower(name) like '%ilimit%';
