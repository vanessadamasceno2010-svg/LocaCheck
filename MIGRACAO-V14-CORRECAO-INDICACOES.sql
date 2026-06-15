-- V14 - Correção do bônus por indicação
-- Rode no Supabase SQL Editor antes de subir a versão V14.
-- Esta versão corrige casos em que o perfil já era criado automaticamente antes do front aplicar o código de indicação.

create extension if not exists pgcrypto;

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

-- Função chamada pelo site após login/cadastro para aplicar o bônus pendente.
-- Ela é segura e idempotente: se o bônus já foi aplicado, não duplica créditos.
create or replace function public.claim_referral_bonus(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_referral_code text := nullif(trim(coalesce(p_referral_code, '')), '');
  v_bonus integer := 2;
  v_updated_rows integer := 0;
begin
  if v_new_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if v_referral_code is null then
    return jsonb_build_object('success', false, 'message', 'Código de indicação vazio.');
  end if;

  select id
    into v_referrer_id
  from public.profiles
  where lower(referral_code) = lower(v_referral_code)
    and id <> v_new_user_id
  limit 1;

  if v_referrer_id is null then
    return jsonb_build_object('success', false, 'message', 'Código de indicação inválido.');
  end if;

  if exists (
    select 1
    from public.credit_movements
    where movement_type = 'referral_bonus'
      and related_user_id = v_new_user_id
  ) then
    return jsonb_build_object('success', true, 'already_applied', true, 'message', 'Bônus já aplicado.');
  end if;

  update public.profiles
  set referred_by = v_referrer_id,
      referred_by_code = v_referral_code,
      referred_at = coalesce(referred_at, now())
  where id = v_new_user_id
    and referred_by is null;

  get diagnostics v_updated_rows = row_count;

  if v_updated_rows = 0 then
    return jsonb_build_object('success', false, 'message', 'Este cadastro já possui indicação vinculada.');
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + v_bonus,
      referral_bonus_credits = coalesce(referral_bonus_credits, 0) + v_bonus
  where id = v_referrer_id;

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
    v_new_user_id
  );

  insert into public.activity_logs (
    user_id,
    action,
    details
  ) values (
    v_referrer_id,
    'referral_bonus_granted',
    jsonb_build_object(
      'referrer_id', v_referrer_id,
      'new_user_id', v_new_user_id,
      'bonus_credits', v_bonus,
      'referral_code', v_referral_code
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_applied', false,
    'referrer_id', v_referrer_id,
    'new_user_id', v_new_user_id,
    'bonus_credits', v_bonus,
    'message', 'Bônus de indicação aplicado com sucesso.'
  );
end;
$$;

grant execute on function public.claim_referral_bonus(text) to authenticated;

-- Mantém o trigger automático para perfis que já nascerem com referred_by_code.
create or replace function public.apply_referral_bonus_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_referral_code text;
  v_bonus integer := 2;
begin
  v_referral_code := nullif(trim(coalesce(new.referred_by_code, '')), '');

  if v_referral_code is null then
    return new;
  end if;

  select id
    into v_referrer_id
  from public.profiles
  where lower(referral_code) = lower(v_referral_code)
    and id <> new.id
  limit 1;

  if v_referrer_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.credit_movements
    where movement_type = 'referral_bonus'
      and related_user_id = new.id
  ) then
    return new;
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + v_bonus,
      referral_bonus_credits = coalesce(referral_bonus_credits, 0) + v_bonus
  where id = v_referrer_id;

  update public.profiles
  set referred_by = v_referrer_id,
      referred_by_code = v_referral_code,
      referred_at = now()
  where id = new.id;

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
    new.id
  );

  insert into public.activity_logs (
    user_id,
    action,
    details
  ) values (
    v_referrer_id,
    'referral_bonus_granted',
    jsonb_build_object(
      'referrer_id', v_referrer_id,
      'new_user_id', new.id,
      'bonus_credits', v_bonus,
      'referral_code', v_referral_code
    )
  );

  return new;
end;
$$;

drop trigger if exists apply_referral_bonus_on_profile_insert_trigger on public.profiles;
create trigger apply_referral_bonus_on_profile_insert_trigger
after insert on public.profiles
for each row
execute function public.apply_referral_bonus_on_profile_insert();
