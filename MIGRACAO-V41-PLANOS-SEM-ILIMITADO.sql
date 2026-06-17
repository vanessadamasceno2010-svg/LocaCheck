-- V41 - Planos sem ilimitado e 150 créditos como mais econômico
-- Compatível com a estrutura atual da tabela plans, sem usar updated_at, description ou ON CONFLICT.

-- Cria ou atualiza o plano de 150 créditos por R$ 97,50
do $$
begin
  if exists (
    select 1
    from public.plans
    where lower(name) = lower('150 Créditos')
  ) then
    update public.plans
    set
      credits = 150,
      price = 97.50,
      active = true,
      is_unlimited = false,
      plan_type = 'credits',
      duration_days = 30
    where lower(name) = lower('150 Créditos');
  else
    insert into public.plans (
      name,
      credits,
      price,
      active,
      is_unlimited,
      plan_type,
      duration_days
    )
    values (
      '150 Créditos',
      150,
      97.50,
      true,
      false,
      'credits',
      30
    );
  end if;
end $$;

-- Remove o plano ilimitado da tela de compra/desativa no banco.
update public.plans
set
  active = false,
  is_unlimited = false
where is_unlimited = true
   or lower(name) like '%ilimit%';

-- Garante que o plano de 100 créditos continue ativo, mas sem marcação de melhor opção no código.
update public.plans
set
  active = true,
  is_unlimited = false,
  plan_type = 'credits'
where credits = 100
   or lower(name) like '%100%';
