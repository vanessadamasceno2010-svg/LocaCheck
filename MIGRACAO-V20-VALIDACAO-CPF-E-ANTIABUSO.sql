-- ============================================================
-- LocaCheck v20 - Validação de CPF e anti-abuso básico
-- ============================================================
-- Rode este arquivo depois da v19.
-- Esta etapa não apaga dados. Ela adiciona validações para novos cadastros/consultas.

-- ============================================================
-- 1) Garantias básicas de auditoria e movimentação
-- ============================================================

alter table public.activity_logs add column if not exists user_id uuid;
alter table public.activity_logs add column if not exists action text;
alter table public.activity_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.activity_logs add column if not exists created_at timestamptz default now();

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
-- 2) Função para validar CPF no banco
-- ============================================================

create or replace function public.is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  sum1 integer := 0;
  sum2 integer := 0;
  d1 integer;
  d2 integer;
  i integer;
begin
  if length(cpf) <> 11 then
    return false;
  end if;

  if cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    sum1 := sum1 + cast(substr(cpf, i, 1) as integer) * (11 - i);
  end loop;

  d1 := (sum1 * 10) % 11;
  if d1 = 10 then
    d1 := 0;
  end if;

  if d1 <> cast(substr(cpf, 10, 1) as integer) then
    return false;
  end if;

  for i in 1..10 loop
    sum2 := sum2 + cast(substr(cpf, i, 1) as integer) * (12 - i);
  end loop;

  d2 := (sum2 * 10) % 11;
  if d2 = 10 then
    d2 := 0;
  end if;

  return d2 = cast(substr(cpf, 11, 1) as integer);
end;
$$;

-- ============================================================
-- 3) Trigger para impedir novas ocorrências com CPF inválido
-- ============================================================
-- Importante: o trigger roda apenas quando cpf_full é inserido/alterado.
-- Assim, aprovar/reprovar ocorrências antigas não será bloqueado.

create or replace function public.enforce_records_valid_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.cpf_full := regexp_replace(coalesce(new.cpf_full, ''), '\D', '', 'g');
  new.cpf4 := right(new.cpf_full, 4);

  if not public.is_valid_cpf(new.cpf_full) then
    raise exception 'CPF inválido. Informe um CPF completo e válido.';
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_records_valid_cpf_insert_trigger on public.records;
drop trigger if exists enforce_records_valid_cpf_update_trigger on public.records;

create trigger enforce_records_valid_cpf_insert_trigger
before insert on public.records
for each row
execute function public.enforce_records_valid_cpf();

create trigger enforce_records_valid_cpf_update_trigger
before update of cpf_full on public.records
for each row
execute function public.enforce_records_valid_cpf();

-- ============================================================
-- 4) Anti-abuso leve para consultas
-- ============================================================
-- O app chama esta função antes de consultar.
-- Admin não é limitado.
-- Usuário comum é bloqueado temporariamente em caso de excesso.

create or replace function public.can_start_consultation(p_search text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_search text := trim(coalesce(p_search, ''));
  v_count_10min integer := 0;
  v_count_day integer := 0;
  v_same_recent integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Entre na conta para consultar.');
  end if;

  if public.is_admin() then
    return jsonb_build_object('success', true);
  end if;

  if length(v_search) < 3 then
    return jsonb_build_object('success', false, 'message', 'Digite pelo menos 3 caracteres para consultar.');
  end if;

  select count(*) into v_count_10min
  from public.consultation_logs
  where user_id = v_user_id
    and created_at >= now() - interval '10 minutes';

  if v_count_10min >= 30 then
    insert into public.activity_logs (user_id, action, details, created_at)
    values (
      v_user_id,
      'consultation_rate_limited',
      jsonb_build_object('window', '10_minutes', 'count', v_count_10min),
      now()
    );

    return jsonb_build_object(
      'success', false,
      'message', 'Você realizou muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.'
    );
  end if;

  select count(*) into v_count_day
  from public.consultation_logs
  where user_id = v_user_id
    and created_at >= now() - interval '24 hours';

  if v_count_day >= 200 then
    insert into public.activity_logs (user_id, action, details, created_at)
    values (
      v_user_id,
      'consultation_daily_limit_reached',
      jsonb_build_object('window', '24_hours', 'count', v_count_day),
      now()
    );

    return jsonb_build_object(
      'success', false,
      'message', 'Limite diário de segurança atingido. Tente novamente mais tarde.'
    );
  end if;

  select count(*) into v_same_recent
  from public.consultation_logs
  where user_id = v_user_id
    and lower(coalesce(searched_text, '')) = lower(v_search)
    and created_at >= now() - interval '30 seconds';

  if v_same_recent >= 1 then
    return jsonb_build_object(
      'success', false,
      'message', 'Essa consulta foi feita agora há pouco. Aguarde alguns segundos antes de repetir.'
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.can_start_consultation(text) to authenticated;

-- ============================================================
-- 5) Limite anti-abuso para indicação
-- ============================================================
-- Mantém o bônus de 2 créditos, mas limita exageros automáticos.
-- Não altera bônus já aplicado.

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
  v_daily_count integer := 0;
  v_month_count integer := 0;
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

  select count(*) into v_daily_count
  from public.credit_movements
  where user_id = v_referrer_id
    and movement_type = 'referral_bonus'
    and created_at >= now() - interval '24 hours';

  if v_daily_count >= 20 then
    insert into public.activity_logs (user_id, action, details, created_at)
    values (
      v_referrer_id,
      'referral_daily_limit_reached',
      jsonb_build_object('count_24h', v_daily_count, 'new_user_id', p_new_user_id, 'referral_code', v_referral_code),
      now()
    );

    return jsonb_build_object('success', false, 'message', 'Limite diário de indicações atingido.');
  end if;

  select count(*) into v_month_count
  from public.credit_movements
  where user_id = v_referrer_id
    and movement_type = 'referral_bonus'
    and created_at >= now() - interval '30 days';

  if v_month_count >= 100 then
    insert into public.activity_logs (user_id, action, details, created_at)
    values (
      v_referrer_id,
      'referral_monthly_limit_reached',
      jsonb_build_object('count_30d', v_month_count, 'new_user_id', p_new_user_id, 'referral_code', v_referral_code),
      now()
    );

    return jsonb_build_object('success', false, 'message', 'Limite mensal de indicações atingido.');
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
        'source', 'v20_referral_with_anti_abuse'
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

-- Fallback autenticado usado pelo app, quando necessário.
create or replace function public.claim_referral_bonus(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  return public.service_claim_referral_bonus(auth.uid(), p_referral_code);
end;
$$;

grant execute on function public.claim_referral_bonus(text) to authenticated;

-- Registro da etapa.
insert into public.activity_logs (user_id, action, details, created_at)
values (
  auth.uid(),
  'migration_v20_validation_anti_abuse_applied',
  jsonb_build_object('step', 'v20_validacao_cpf_antiabuso'),
  now()
);
