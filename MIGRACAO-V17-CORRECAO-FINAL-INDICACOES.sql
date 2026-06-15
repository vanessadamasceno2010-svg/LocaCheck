-- V17 - Correção final do bônus de indicação
-- Rode este arquivo no Supabase SQL Editor.
-- Ele corrige a tabela activity_logs, recria as funções de indicação e deixa o reprocessamento disponível.

create extension if not exists pgcrypto;

-- 1) Garante que a tabela de logs tenha as colunas usadas pelo sistema.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.activity_logs
add column if not exists user_id uuid;

alter table public.activity_logs
add column if not exists action text;

alter table public.activity_logs
add column if not exists details jsonb default '{}'::jsonb;

alter table public.activity_logs
add column if not exists created_at timestamptz default now();

create index if not exists activity_logs_created_at_idx
on public.activity_logs (created_at desc);

create index if not exists activity_logs_action_idx
on public.activity_logs (action);

-- 2) Função para identificar admin.
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

-- 3) Campos necessários em profiles.
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referred_by_code text,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_bonus_credits integer not null default 0;

update public.profiles
set referral_code = 'LC' || upper(substr(replace(id::text, '-', ''), 1, 10))
where referral_code is null or trim(referral_code) = '';

create unique index if not exists profiles_referral_code_unique_idx
on public.profiles (lower(referral_code))
where referral_code is not null;

-- 4) Movimentações de crédito.
create table if not exists public.credit_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  movement_type text not null,
  description text,
  related_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.credit_movements enable row level security;
grant select on public.credit_movements to authenticated;

create unique index if not exists credit_movements_referral_once_idx
on public.credit_movements (related_user_id)
where movement_type = 'referral_bonus' and related_user_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_movements'
      and policyname = 'Users can view own credit movements'
  ) then
    create policy "Users can view own credit movements"
    on public.credit_movements
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_movements'
      and policyname = 'Admins can view all credit movements'
  ) then
    create policy "Admins can view all credit movements"
    on public.credit_movements
    for select
    to authenticated
    using (public.is_admin());
  end if;
end $$;

-- 5) Função principal. Usa trava interna para evitar chamada duplicada pelos triggers.
create or replace function public.service_claim_referral_bonus(
  p_new_user_id uuid,
  p_referral_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_referrer_id uuid;
  v_referral_code text := upper(nullif(trim(coalesce(p_referral_code, '')), ''));
  v_bonus integer := 2;
  v_movement_id uuid;
  v_existing_referrer uuid;
begin
  if p_new_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuário indicado inválido.');
  end if;

  if v_referral_code is null then
    return jsonb_build_object('success', false, 'message', 'Código de indicação vazio.');
  end if;

  select id
    into v_referrer_id
  from public.profiles
  where lower(referral_code) = lower(v_referral_code)
    and id <> p_new_user_id
  limit 1;

  if v_referrer_id is null then
    return jsonb_build_object('success', false, 'message', 'Código de indicação inválido ou autoindicação bloqueada.');
  end if;

  -- Evita que o trigger de profiles chame esta função novamente durante a criação do perfil.
  perform set_config('app.referral_processing', '1', true);

  insert into public.profiles (
    id,
    nome,
    whatsapp,
    role,
    credits,
    consultas,
    referral_code,
    referred_by_code
  )
  select
    u.id,
    coalesce(nullif(u.raw_user_meta_data->>'nome', ''), 'Usuário'),
    coalesce(u.raw_user_meta_data->>'whatsapp', ''),
    'user',
    20,
    0,
    'LC' || upper(substr(replace(u.id::text, '-', ''), 1, 10)),
    v_referral_code
  from auth.users u
  where u.id = p_new_user_id
  on conflict (id) do update
    set referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by_code = coalesce(public.profiles.referred_by_code, excluded.referred_by_code);

  if not exists (select 1 from public.profiles where id = p_new_user_id) then
    return jsonb_build_object('success', false, 'message', 'Perfil do usuário indicado ainda não foi encontrado.');
  end if;

  select referred_by
    into v_existing_referrer
  from public.profiles
  where id = p_new_user_id;

  if exists (
    select 1
    from public.credit_movements
    where movement_type = 'referral_bonus'
      and related_user_id = p_new_user_id
  ) then
    return jsonb_build_object('success', true, 'already_applied', true, 'message', 'Bônus já aplicado.');
  end if;

  if v_existing_referrer is not null and v_existing_referrer <> v_referrer_id then
    return jsonb_build_object('success', false, 'message', 'Este cadastro já possui outra indicação vinculada.');
  end if;

  update public.profiles
  set referred_by = v_referrer_id,
      referred_by_code = v_referral_code,
      referred_at = coalesce(referred_at, now())
  where id = p_new_user_id
    and (referred_by is null or referred_by = v_referrer_id);

  insert into public.credit_movements (
    user_id,
    amount,
    movement_type,
    description,
    related_user_id
  ) values (
    v_referrer_id,
    v_bonus,
    'referral_bonus',
    'Bônus de 2 créditos por cadastro realizado através do link de indicação.',
    p_new_user_id
  )
  on conflict do nothing
  returning id into v_movement_id;

  if v_movement_id is null then
    return jsonb_build_object('success', true, 'already_applied', true, 'message', 'Bônus já aplicado.');
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + v_bonus,
      referral_bonus_credits = coalesce(referral_bonus_credits, 0) + v_bonus
  where id = v_referrer_id;

  insert into public.activity_logs (
    user_id,
    action,
    details,
    created_at
  ) values (
    v_referrer_id,
    'referral_bonus_granted',
    jsonb_build_object(
      'referrer_id', v_referrer_id,
      'new_user_id', p_new_user_id,
      'bonus_credits', v_bonus,
      'referral_code', v_referral_code,
      'movement_id', v_movement_id,
      'source', 'v17_referral_fix'
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'already_applied', false,
    'referrer_id', v_referrer_id,
    'new_user_id', p_new_user_id,
    'bonus_credits', v_bonus,
    'movement_id', v_movement_id,
    'message', 'Bônus de indicação aplicado com sucesso.'
  );
end;
$$;

revoke execute on function public.service_claim_referral_bonus(uuid, text) from public;
revoke execute on function public.service_claim_referral_bonus(uuid, text) from anon;
revoke execute on function public.service_claim_referral_bonus(uuid, text) from authenticated;
grant execute on function public.service_claim_referral_bonus(uuid, text) to service_role;

-- 6) Fallback para quando o novo usuário faz login pelo app.
create or replace function public.claim_referral_bonus(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  return public.service_claim_referral_bonus(auth.uid(), p_referral_code);
end;
$$;

grant execute on function public.claim_referral_bonus(text) to authenticated;

-- 7) Trigger em profiles.
create or replace function public.apply_referral_bonus_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_code text;
begin
  if current_setting('app.referral_processing', true) = '1' then
    return new;
  end if;

  v_code := nullif(trim(coalesce(new.referred_by_code, '')), '');

  if v_code is not null then
    perform public.service_claim_referral_bonus(new.id, v_code);
  end if;

  return new;
end;
$$;

drop trigger if exists apply_referral_bonus_on_profile_insert_trigger on public.profiles;
create trigger apply_referral_bonus_on_profile_insert_trigger
after insert on public.profiles
for each row
execute function public.apply_referral_bonus_on_profile_insert();

-- 8) Trigger em auth.users.
create or replace function public.apply_referral_bonus_on_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_code text;
begin
  v_code := nullif(trim(coalesce(
    new.raw_user_meta_data->>'referral_code',
    new.raw_user_meta_data->>'ref',
    ''
  )), '');

  perform set_config('app.referral_processing', '1', true);

  insert into public.profiles (
    id,
    nome,
    whatsapp,
    role,
    credits,
    consultas,
    referral_code,
    referred_by_code
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    'user',
    20,
    0,
    'LC' || upper(substr(replace(new.id::text, '-', ''), 1, 10)),
    v_code
  )
  on conflict (id) do update
    set nome = coalesce(nullif(excluded.nome, ''), public.profiles.nome),
        whatsapp = coalesce(nullif(excluded.whatsapp, ''), public.profiles.whatsapp),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by_code = coalesce(public.profiles.referred_by_code, excluded.referred_by_code);

  perform set_config('app.referral_processing', '0', true);

  if v_code is not null then
    perform public.service_claim_referral_bonus(new.id, v_code);
  end if;

  return new;
end;
$$;

drop trigger if exists apply_referral_bonus_on_auth_user_insert_trigger on auth.users;
create trigger apply_referral_bonus_on_auth_user_insert_trigger
after insert on auth.users
for each row
execute function public.apply_referral_bonus_on_auth_user_insert();

-- 9) Função de reprocessamento manual.
create or replace function public.reprocess_pending_referral_bonuses()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row record;
  v_total integer := 0;
  v_applied integer := 0;
  v_result jsonb;
begin
  for v_row in
    select
      u.id as user_id,
      nullif(trim(coalesce(
        p.referred_by_code,
        u.raw_user_meta_data->>'referral_code',
        u.raw_user_meta_data->>'ref',
        ''
      )), '') as referral_code
    from auth.users u
    left join public.profiles p on p.id = u.id
    where nullif(trim(coalesce(
        p.referred_by_code,
        u.raw_user_meta_data->>'referral_code',
        u.raw_user_meta_data->>'ref',
        ''
      )), '') is not null
      and not exists (
        select 1
        from public.credit_movements cm
        where cm.movement_type = 'referral_bonus'
          and cm.related_user_id = u.id
      )
  loop
    v_total := v_total + 1;
    v_result := public.service_claim_referral_bonus(v_row.user_id, v_row.referral_code);

    if coalesce((v_result->>'success')::boolean, false) = true
       and coalesce((v_result->>'already_applied')::boolean, false) = false then
      v_applied := v_applied + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'checked', v_total,
    'applied', v_applied
  );
end;
$$;

-- IMPORTANTE: depois de rodar este arquivo, rode manualmente:
-- select public.reprocess_pending_referral_bonuses();
