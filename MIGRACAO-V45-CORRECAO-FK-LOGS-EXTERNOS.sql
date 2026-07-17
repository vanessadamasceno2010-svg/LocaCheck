-- =============================================================
-- LocaCheck V45
-- 5 créditos iniciais, indicação desativada e correção segura dos logs externos
-- =============================================================
-- Rode no Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Esta migração:
-- 1. NÃO altera usuários já existentes.
-- 2. NÃO altera PushinPay, pagamentos, planos ou o bucket records.
-- 3. NÃO cria trigger em auth.users.
-- 4. Desativa o bônus de indicação sem apagar o histórico antigo.
-- 5. Corrige a restrição que impedia o tipo external_advanced de ser salvo.
-- 6. Guarda CPF completo de consulta externa somente em tabela protegida por RLS.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1) Consulta externa: novas informações para auditoria admin
-- -------------------------------------------------------------
create table if not exists public.external_consultation_cache (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text not null,
  cpf4 text,
  consultation_type text not null,
  datasets text[] default array[]::text[],
  result_summary jsonb default '{}'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cpf_hash, consultation_type)
);

create table if not exists public.external_consultation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  cpf_hash text,
  cpf4 text,
  cpf_full text,
  provider text default 'BigDataCorp',
  consultation_type text,
  datasets text[] default array[]::text[],
  credits_charged integer default 0,
  credits_balance_after integer,
  cache_hit boolean default false,
  status text default 'success',
  result_summary jsonb default '{}'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

alter table public.external_consultation_logs
  add column if not exists cpf_full text;

alter table public.external_consultation_logs
  add column if not exists credits_balance_after integer;

alter table public.external_consultation_logs
  alter column credits_charged set default 0;

-- -------------------------------------------------------------
-- Chave estrangeira segura para o usuário do Supabase Auth
-- -------------------------------------------------------------
-- Algumas instalações antigas ficaram com uma FK diferente ou possuem
-- activity_logs históricos de usuários que já não existem no Auth.
-- Removemos somente FKs da coluna user_id desta tabela, preservamos os logs
-- antigos com user_id nulo e recriamos a relação correta com auth.users.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.external_consultation_logs'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%foreign key (user_id)%'
  loop
    execute format(
      'alter table public.external_consultation_logs drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

-- Um usuário removido do Auth não pode continuar preso por FK.
-- O registro histórico permanece; apenas o vínculo inexistente fica nulo.
update public.external_consultation_logs e
set user_id = null
where e.user_id is not null
  and not exists (
    select 1
    from auth.users u
    where u.id = e.user_id
  );

alter table public.external_consultation_logs
  drop constraint if exists external_consultation_logs_user_id_auth_fkey;

alter table public.external_consultation_logs
  add constraint external_consultation_logs_user_id_auth_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null
  not valid;

alter table public.external_consultation_logs
  validate constraint external_consultation_logs_user_id_auth_fkey;

-- A V28 aceitava somente external_basic e external_complete.
-- A aplicação atual usa external_advanced, por isso o insert do log falhava.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.external_consultation_logs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%consultation_type%'
  loop
    execute format(
      'alter table public.external_consultation_logs drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

alter table public.external_consultation_logs
  drop constraint if exists external_consultation_logs_type_v44_check;

update public.external_consultation_logs
set consultation_type = 'external_advanced'
where consultation_type is not null
  and consultation_type not in (
    'external',
    'external_basic',
    'external_complete',
    'external_advanced'
  );

alter table public.external_consultation_logs
  add constraint external_consultation_logs_type_v44_check
  check (
    consultation_type is null
    or consultation_type in (
      'external',
      'external_basic',
      'external_complete',
      'external_advanced'
    )
  ) not valid;

alter table public.external_consultation_logs
  validate constraint external_consultation_logs_type_v44_check;

-- O cache possuía a mesma restrição antiga.
do $$
declare
  r record;
begin
  if to_regclass('public.external_consultation_cache') is not null then
    for r in
      select conname
      from pg_constraint
      where conrelid = 'public.external_consultation_cache'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%consultation_type%'
    loop
      execute format(
        'alter table public.external_consultation_cache drop constraint if exists %I',
        r.conname
      );
    end loop;
  end if;
end $$;

alter table public.external_consultation_cache
  drop constraint if exists external_consultation_cache_type_v44_check;

update public.external_consultation_cache
set consultation_type = 'external_advanced'
where consultation_type not in (
  'external',
  'external_basic',
  'external_complete',
  'external_advanced'
);

alter table public.external_consultation_cache
  add constraint external_consultation_cache_type_v44_check
  check (
    consultation_type in (
      'external',
      'external_basic',
      'external_complete',
      'external_advanced'
    )
  ) not valid;

alter table public.external_consultation_cache
  validate constraint external_consultation_cache_type_v44_check;

create index if not exists external_consultation_logs_created_at_v44_idx
on public.external_consultation_logs (created_at desc);

-- Recupera CPF completo de logs que já possuem esse dado no resumo tratado.
update public.external_consultation_logs
set cpf_full = regexp_replace(
  coalesce(result_summary->>'cpf', result_summary->>'cpf_masked', ''),
  '\D',
  '',
  'g'
)
where cpf_full is null
  and length(
    regexp_replace(
      coalesce(result_summary->>'cpf', result_summary->>'cpf_masked', ''),
      '\D',
      '',
      'g'
    )
  ) = 11;

-- Recupera consultas antigas que ficaram somente no activity_logs.
-- Se o usuário histórico já não existir em auth.users, o log é preservado
-- com user_id nulo em vez de bloquear toda a migração.
with activity_candidates as (
  select
    a.*,
    case
      when a.user_id is not null
       and exists (
         select 1
         from auth.users u
         where u.id = a.user_id
       )
      then a.user_id
      else null::uuid
    end as safe_user_id
  from public.activity_logs a
  where a.action = 'external_consultation_completed'
)
insert into public.external_consultation_logs (
  user_id,
  cpf4,
  provider,
  consultation_type,
  datasets,
  credits_charged,
  credits_balance_after,
  cache_hit,
  status,
  result_summary,
  raw_response,
  created_at
)
select
  a.safe_user_id,
  nullif(a.details->>'cpf4', ''),
  'BigDataCorp',
  case
    when coalesce(a.details->>'consultation_type', '') in (
      'external',
      'external_basic',
      'external_complete',
      'external_advanced'
    ) then a.details->>'consultation_type'
    else 'external_advanced'
  end,
  case
    when jsonb_typeof(a.details->'datasets') = 'array'
      then array(select jsonb_array_elements_text(a.details->'datasets'))
    else array[]::text[]
  end,
  case
    when coalesce(a.details->>'credits_charged', '') ~ '^\d+$'
      then (a.details->>'credits_charged')::integer
    else 0
  end,
  case
    when coalesce(a.details->>'credits_balance_after', '') ~ '^-?\d+$'
      then (a.details->>'credits_balance_after')::integer
    else null
  end,
  case
    when lower(coalesce(a.details->>'cache_hit', '')) in ('true', 'false')
      then (a.details->>'cache_hit')::boolean
    else false
  end,
  'success',
  coalesce(a.details, '{}'::jsonb),
  '{}'::jsonb,
  a.created_at
from activity_candidates a
where not exists (
  select 1
  from public.external_consultation_logs e
  where e.user_id is not distinct from a.safe_user_id
    and coalesce(e.cpf4, '') = coalesce(a.details->>'cpf4', '')
    and abs(extract(epoch from (e.created_at - a.created_at))) <= 10
);

-- RLS permanece protegendo os dados.
alter table public.external_consultation_logs enable row level security;

drop policy if exists "Admins can view external consultation logs" on public.external_consultation_logs;
drop policy if exists "Admins can view all external consultation logs" on public.external_consultation_logs;
drop policy if exists "Users can view own external consultation logs" on public.external_consultation_logs;

create policy "Admins can view external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (public.is_admin());

create policy "Users can view own external consultation logs"
on public.external_consultation_logs
for select
to authenticated
using (user_id = auth.uid());

grant select on public.external_consultation_logs to authenticated;
revoke insert, update, delete on public.external_consultation_logs from anon, authenticated;

comment on column public.external_consultation_logs.cpf_full is
'CPF completo consultado externamente. Acesso restrito pelo RLS ao usuário dono e aos administradores.';

comment on column public.external_consultation_logs.credits_balance_after is
'Saldo de créditos do usuário imediatamente após a consulta externa.';

-- -------------------------------------------------------------
-- 2) Programa de indicação desativado
-- -------------------------------------------------------------
-- Reforça a remoção do trigger bloqueante antigo no Supabase Auth.
drop trigger if exists apply_referral_bonus_on_auth_user_insert_trigger on auth.users;

-- Remove apenas triggers de indicação da tabela profiles.
do $$
declare
  r record;
begin
  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and not tgisinternal
      and (
        tgname ilike '%referral%'
        or tgname ilike '%indicacao%'
        or tgname ilike '%indicação%'
      )
  loop
    execute format('drop trigger if exists %I on public.profiles', r.tgname);
  end loop;
end $$;

-- Mantém as assinaturas antigas apenas para responder de forma segura,
-- sem conceder créditos e sem quebrar versões antigas durante a transição.
create or replace function public.service_claim_referral_bonus(
  p_new_user_id uuid,
  p_referral_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'success', false,
    'disabled', true,
    'message', 'O programa de indicação foi desativado.'
  );
end;
$$;

create or replace function public.claim_referral_bonus(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'success', false,
    'disabled', true,
    'message', 'O programa de indicação foi desativado.'
  );
end;
$$;

revoke all on function public.service_claim_referral_bonus(uuid, text) from public, anon, authenticated;
grant execute on function public.service_claim_referral_bonus(uuid, text) to service_role;

grant execute on function public.claim_referral_bonus(text) to authenticated;
revoke execute on function public.claim_referral_bonus(text) from anon;

-- O histórico antigo de bônus e movimentações não é apagado.
-- Apenas novos bônus deixam de ser gerados.

-- -------------------------------------------------------------
-- 3) Todo novo usuário comum recebe exatamente 5 créditos
-- -------------------------------------------------------------
-- Usuários existentes não são alterados.
alter table public.profiles
  alter column credits set default 5;

-- Remove regras antigas conflitantes de 10 ou 0 créditos.
drop trigger if exists zzz_force_new_user_initial_credits_10_trigger on public.profiles;
drop trigger if exists zzz_locacheck_force_new_user_zero_credits on public.profiles;
drop trigger if exists trg_profiles_v38_security_defaults on public.profiles;
drop trigger if exists trg_profiles_v44_security_defaults on public.profiles;
drop trigger if exists zzzz_locacheck_initial_credits_5_trigger on public.profiles;

-- Preserva a proteção de campos sensíveis e define 5 créditos no INSERT comum.
create or replace function public.protect_profiles_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user = 'postgres'
     or current_user = 'service_role'
     or current_setting('request.jwt.claim.role', true) = 'service_role'
     or public.is_admin()
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.credits := 5;
    new.consultas := 0;
    new.unlimited_until := null;
    new.account_status := coalesce(new.account_status, 'ativo');
    new.is_blocked := coalesce(new.is_blocked, false);
    if new.email is not null then
      new.email := lower(new.email);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.credits := old.credits;
    new.consultas := old.consultas;
    new.unlimited_until := old.unlimited_until;
    if new.email is not null then
      new.email := lower(new.email);
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profiles_sensitive_fields_trigger on public.profiles;
create trigger protect_profiles_sensitive_fields_trigger
before insert or update on public.profiles
for each row
execute function public.protect_profiles_sensitive_fields();

-- Regra final também cobre perfis criados por service_role ou funções internas.
-- Ela atua somente em public.profiles e não pode bloquear auth.users.
create or replace function public.locacheck_force_initial_credits_5()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := coalesce(new.role, 'user');
  new.consultas := coalesce(new.consultas, 0);
  new.account_status := coalesce(new.account_status, 'ativo');
  new.is_blocked := coalesce(new.is_blocked, false);

  if lower(new.role) <> 'admin' then
    new.credits := 5;
    new.consultas := 0;
    new.unlimited_until := null;
  end if;

  return new;
end;
$$;

create trigger zzzz_locacheck_initial_credits_5_trigger
before insert on public.profiles
for each row
execute function public.locacheck_force_initial_credits_5();

-- Mantém compatibilidade com login Google e chamadas antigas.
-- O segundo parâmetro permanece na assinatura, mas indicação não é aplicada.
create or replace function public.ensure_profile_for_user(
  p_user_id uuid,
  p_referral_code text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_profile public.profiles%rowtype;
  v_name text;
  v_email text;
begin
  select * into v_user
  from auth.users
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado no Auth.';
  end if;

  v_email := lower(coalesce(v_user.email, ''));
  v_name := coalesce(
    nullif(v_user.raw_user_meta_data->>'nome', ''),
    nullif(v_user.raw_user_meta_data->>'full_name', ''),
    nullif(v_user.raw_user_meta_data->>'name', ''),
    nullif(v_email, ''),
    'Usuário'
  );

  insert into public.profiles (
    id,
    nome,
    email,
    whatsapp,
    role,
    credits,
    consultas,
    account_status,
    is_blocked
  ) values (
    p_user_id,
    v_name,
    nullif(v_email, ''),
    coalesce(v_user.raw_user_meta_data->>'whatsapp', ''),
    'user',
    5,
    0,
    'ativo',
    false
  )
  on conflict (id) do update
    set nome = case
          when public.profiles.nome is null
            or public.profiles.nome = ''
            or public.profiles.nome = 'Usuário'
          then excluded.nome
          else public.profiles.nome
        end,
        email = coalesce(public.profiles.email, excluded.email),
        whatsapp = coalesce(nullif(public.profiles.whatsapp, ''), excluded.whatsapp)
  returning * into v_profile;

  return v_profile;
end;
$$;

-- -------------------------------------------------------------
-- 4) Painel admin: CPF externo completo e saldo após consulta
-- -------------------------------------------------------------
create or replace function public.get_admin_activity_overview(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_today date := (now() at time zone 'America/Fortaleza')::date;
  v_start_date date;
  v_start_at timestamptz;
  v_today_at timestamptz;
  v_week_at timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso permitido apenas para administradores.';
  end if;

  v_start_date := v_today - (v_days - 1);
  v_start_at := (v_start_date::timestamp at time zone 'America/Fortaleza');
  v_today_at := (v_today::timestamp at time zone 'America/Fortaleza');
  v_week_at := ((v_today - 6)::timestamp at time zone 'America/Fortaleza');

  with
  internal_period as (
    select
      l.id::text as id,
      l.user_id,
      p.nome as user_name,
      p.email as user_email,
      case
        when coalesce(l.included_with_external, false) then 'internal_included'
        else coalesce(nullif(l.consultation_type, ''), 'internal')
      end as consultation_type,
      'internal'::text as source,
      case
        when length(regexp_replace(coalesce(l.searched_cpf, ''), '\D', '', 'g')) >= 4
          then 'CPF final ' || right(regexp_replace(l.searched_cpf, '\D', '', 'g'), 4)
        when length(regexp_replace(coalesce(l.searched_text, ''), '\D', '', 'g')) = 11
          then 'CPF final ' || right(regexp_replace(l.searched_text, '\D', '', 'g'), 4)
        else left(coalesce(nullif(trim(l.searched_text), ''), 'Não informado'), 120)
      end as searched_display,
      coalesce(l.results_count, 0)::integer as results_count,
      case when coalesce(l.credit_charged, false) then 1 else 0 end::integer as credits_charged,
      null::integer as credits_balance_after,
      coalesce(l.included_with_external, false) as included_with_external,
      false as cache_hit,
      'success'::text as status,
      l.created_at
    from public.consultation_logs l
    left join public.profiles p on p.id = l.user_id
    where l.created_at >= v_start_at
  ),
  external_period as (
    select
      e.id::text as id,
      e.user_id,
      p.nome as user_name,
      p.email as user_email,
      coalesce(nullif(e.consultation_type, ''), 'external_advanced') as consultation_type,
      'external'::text as source,
      case
        when length(regexp_replace(coalesce(e.cpf_full, ''), '\D', '', 'g')) = 11 then
          substr(regexp_replace(e.cpf_full, '\D', '', 'g'), 1, 3) || '.' ||
          substr(regexp_replace(e.cpf_full, '\D', '', 'g'), 4, 3) || '.' ||
          substr(regexp_replace(e.cpf_full, '\D', '', 'g'), 7, 3) || '-' ||
          substr(regexp_replace(e.cpf_full, '\D', '', 'g'), 10, 2)
        when nullif(e.cpf4, '') is not null then 'CPF final ' || e.cpf4
        else 'CPF não informado'
      end as searched_display,
      case
        when jsonb_typeof(e.result_summary) = 'object' and e.status = 'success' then 1
        else 0
      end::integer as results_count,
      coalesce(e.credits_charged, 0)::integer as credits_charged,
      e.credits_balance_after::integer as credits_balance_after,
      false as included_with_external,
      coalesce(e.cache_hit, false) as cache_hit,
      coalesce(nullif(e.status, ''), 'success') as status,
      e.created_at
    from public.external_consultation_logs e
    left join public.profiles p on p.id = e.user_id
    where e.created_at >= v_start_at
  ),
  all_consultations as (
    select * from internal_period
    union all
    select * from external_period
  ),
  daily_visits as (
    select
      day::date as day,
      coalesce(count(v.id), 0)::integer as visits
    from generate_series(v_start_date, v_today, interval '1 day') day
    left join public.site_visits v on v.visit_date = day::date
    group by day::date
    order by day::date
  )
  select jsonb_build_object(
    'period_days', v_days,
    'period_start', v_start_date,
    'period_end', v_today,
    'summary', jsonb_build_object(
      'visits_today', (select count(*) from public.site_visits where visit_date = v_today),
      'visits_7_days', (select count(*) from public.site_visits where visit_date >= v_today - 6 and visit_date <= v_today),
      'visits_period', (select count(*) from public.site_visits where visit_date >= v_start_date and visit_date <= v_today),
      'consultations_today', (
        (select count(*) from public.consultation_logs where created_at >= v_today_at)
        +
        (select count(*) from public.external_consultation_logs where created_at >= v_today_at)
      ),
      'consultations_7_days', (
        (select count(*) from public.consultation_logs where created_at >= v_week_at)
        +
        (select count(*) from public.external_consultation_logs where created_at >= v_week_at)
      ),
      'consultations_period', (select count(*) from all_consultations),
      'internal_period', (select count(*) from all_consultations where source = 'internal'),
      'external_period', (select count(*) from all_consultations where source = 'external'),
      'active_users_period', (select count(distinct user_id) from all_consultations where user_id is not null),
      'credits_period', (select coalesce(sum(credits_charged), 0) from all_consultations)
    ),
    'daily_visits', coalesce((
      select jsonb_agg(jsonb_build_object('date', day, 'visits', visits) order by day)
      from daily_visits
    ), '[]'::jsonb),
    'consultations', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc)
      from (
        select *
        from all_consultations
        order by created_at desc
        limit 400
      ) c
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_activity_overview(integer) from public;
grant execute on function public.get_admin_activity_overview(integer) to authenticated;

notify pgrst, 'reload schema';

-- Diagnóstico final: deve retornar 5.
select column_default as credits_default_v45
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'credits';
