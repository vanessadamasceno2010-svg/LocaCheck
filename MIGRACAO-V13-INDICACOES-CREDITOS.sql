-- V13 - Programa de indicação: link compartilhável + 2 créditos por cadastro indicado
-- Rode no Supabase SQL Editor antes de subir a versão V13.

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

-- Campos necessários no perfil do usuário
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referred_by_code text,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_bonus_credits integer not null default 0;

-- Gera código de indicação para usuários antigos
update public.profiles
set referral_code = 'LC' || upper(substr(replace(id::text, '-', ''), 1, 10))
where referral_code is null or trim(referral_code) = '';

create unique index if not exists profiles_referral_code_unique_idx
on public.profiles (lower(referral_code))
where referral_code is not null;

-- Tabela de movimentações de créditos, inicialmente usada para bônus de indicação
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

-- Prepara código de indicação e trava campos sensíveis de indicação para usuário comum
create or replace function public.prepare_profile_referral_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.referral_code is null or trim(new.referral_code) = '' then
      new.referral_code := 'LC' || upper(substr(replace(new.id::text, '-', ''), 1, 10));
    end if;

    if new.referred_by_code is not null then
      new.referred_by_code := nullif(trim(new.referred_by_code), '');
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if current_user = 'postgres'
       or current_user = 'service_role'
       or current_setting('request.jwt.claim.role', true) = 'service_role'
       or public.is_admin()
    then
      return new;
    end if;

    new.referral_code := old.referral_code;
    new.referred_by := old.referred_by;
    new.referred_by_code := old.referred_by_code;
    new.referred_at := old.referred_at;
    new.referral_bonus_credits := old.referral_bonus_credits;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_profile_referral_fields_trigger on public.profiles;
create trigger prepare_profile_referral_fields_trigger
before insert or update on public.profiles
for each row
execute function public.prepare_profile_referral_fields();

-- Aplica bônus ao indicador quando um novo perfil é criado com código de indicação válido
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
