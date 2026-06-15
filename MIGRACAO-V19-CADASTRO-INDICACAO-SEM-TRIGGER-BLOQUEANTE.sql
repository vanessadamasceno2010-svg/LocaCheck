-- V19 - Correção do erro "database error saving new user" no cadastro por indicação
-- Objetivo:
-- 1) Remover triggers de indicação que rodam dentro do Supabase Auth e podem bloquear o cadastro.
-- 2) Manter a aplicação do bônus via rota segura da Vercel (/api/referrals/claim) usando SERVICE_ROLE_KEY.
-- 3) Garantir função manual/fallback para aplicar e reprocessar bônus pendentes.
--
-- Rode este arquivo inteiro no Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- ============================================================
-- 1) Desliga triggers que podem quebrar o cadastro no auth.users
-- ============================================================
-- Esses triggers rodam no momento exato em que o Supabase está salvando o novo usuário.
-- Se qualquer detalhe falhar, o cadastro inteiro retorna "database error saving new user".
-- A partir desta versão, o bônus será aplicado DEPOIS do cadastro pela rota segura da Vercel.

drop trigger if exists apply_referral_bonus_on_auth_user_insert_trigger on auth.users;
drop trigger if exists apply_referral_bonus_on_profile_insert_trigger on public.profiles;

drop function if exists public.apply_referral_bonus_on_auth_user_insert();
drop function if exists public.apply_referral_bonus_on_profile_insert();

-- ============================================================
-- 2) Garante estrutura de logs e movimentações
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

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid,
  add column if not exists referred_by_code text,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_bonus_credits integer not null default 0;

update public.profiles
set referral_code = 'LC' || upper(substr(replace(id::text, '-', ''), 1, 10))
where referral_code is null or trim(referral_code) = '';

create unique index if not exists profiles_referral_code_unique_idx
on public.profiles (lower(referral_code))
where referral_code is not null;

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

-- ============================================================
-- 3) Função admin padrão
-- ============================================================

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
-- 4) Função segura de bônus de indicação
-- ============================================================
-- Esta função NÃO é chamada por trigger de cadastro.
-- Ela é chamada pela rota /api/referrals/claim da Vercel usando SUPABASE_SERVICE_ROLE_KEY.

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
  v_log_error text;
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

  -- Cria/garante profile do novo usuário sem depender de trigger do Auth.
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
        referred_by_code = coalesce(public.profiles.referred_by_code, excluded.referred_by_code),
        nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
        whatsapp = coalesce(nullif(public.profiles.whatsapp, ''), excluded.whatsapp);

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

  -- O log não pode bloquear o bônus. Se falhar, o crédito continua aplicado.
  begin
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
        'source', 'v19_api_after_signup_no_auth_trigger'
      ),
      now()
    );
  exception when others then
    v_log_error := sqlerrm;
  end;

  return jsonb_build_object(
    'success', true,
    'already_applied', false,
    'referrer_id', v_referrer_id,
    'new_user_id', p_new_user_id,
    'bonus_credits', v_bonus,
    'movement_id', v_movement_id,
    'log_error', v_log_error,
    'message', 'Bônus de indicação aplicado com sucesso.'
  );
end;
$$;

revoke execute on function public.service_claim_referral_bonus(uuid, text) from public;
revoke execute on function public.service_claim_referral_bonus(uuid, text) from anon;
revoke execute on function public.service_claim_referral_bonus(uuid, text) from authenticated;
grant execute on function public.service_claim_referral_bonus(uuid, text) to service_role;

-- Fallback autenticado: usado quando o usuário já está logado e ainda existe código pendente no navegador.
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

-- Reprocessamento manual para cadastros que chegaram com referral_code mas ainda não receberam bônus.
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

-- ============================================================
-- 5) Permissões básicas de leitura das movimentações
-- ============================================================

alter table public.credit_movements enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_movements'
      AND policyname = 'Users can view own credit movements'
  ) THEN
    CREATE POLICY "Users can view own credit movements"
    ON public.credit_movements
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_movements'
      AND policyname = 'Admins can view all credit movements'
  ) THEN
    CREATE POLICY "Admins can view all credit movements"
    ON public.credit_movements
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
  END IF;
END $$;

-- ============================================================
-- 6) Resultado final
-- ============================================================

select jsonb_build_object(
  'success', true,
  'step', 'v19_referral_signup_fix',
  'message', 'Triggers bloqueantes removidos. Cadastro por link de indicação não deve mais retornar database error saving new user.'
) as resultado;
