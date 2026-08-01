-- LOCACHECK V60A
-- Contenção imediata e criação das operações administrativas seguras.
-- Pode ser executada mais de uma vez.
-- Não apaga usuários, pagamentos, consultas ou créditos.

begin;

-- 1) Fecha a função que permitia a qualquer usuário promover uma conta.
revoke all on function public.set_user_role_by_email(text, text) from public;
revoke all on function public.set_user_role_by_email(text, text) from anon;
revoke all on function public.set_user_role_by_email(text, text) from authenticated;
revoke all on function public.set_user_role_by_email(text, text) from service_role;

-- 2) Tabela de eventos de segurança. Não armazena CPF pesquisado nem resposta externa.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx
  on public.security_events (created_at desc);

create index if not exists security_events_user_id_idx
  on public.security_events (user_id, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "Admins can view security events" on public.security_events;
create policy "Admins can view security events"
on public.security_events
for select
to authenticated
using (public.is_admin());

revoke all on table public.security_events from anon, authenticated;
grant select on table public.security_events to authenticated;

-- 3) Corrige a proteção dos campos sensíveis.
-- session_user identifica corretamente SQL Editor/postgres.
-- current_user não é usado porque uma função SECURITY DEFINER normalmente aparece como postgres.
create or replace function public.protect_profiles_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_trusted boolean := false;
  v_sensitive_attempt boolean := false;
begin
  v_is_trusted :=
    session_user = 'postgres'
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or public.is_admin();

  if v_is_trusted then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.credits := 5;
    new.consultas := 0;
    new.unlimited_until := null;
    new.account_status := 'ativo';
    new.is_blocked := false;
    new.blocked_at := null;
    new.blocked_reason := null;

    if new.email is not null then
      new.email := lower(trim(new.email));
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_sensitive_attempt :=
      new.role is distinct from old.role
      or new.credits is distinct from old.credits
      or new.consultas is distinct from old.consultas
      or new.unlimited_until is distinct from old.unlimited_until
      or new.account_status is distinct from old.account_status
      or new.is_blocked is distinct from old.is_blocked
      or new.blocked_at is distinct from old.blocked_at
      or new.blocked_reason is distinct from old.blocked_reason;

    if v_sensitive_attempt then
      insert into public.security_events (user_id, event_type, details)
      values (
        auth.uid(),
        'profile_sensitive_update_blocked',
        jsonb_build_object(
          'target_user_id', old.id,
          'attempted_role', new.role,
          'attempted_credits', new.credits,
          'previous_role', old.role,
          'previous_credits', old.credits
        )
      );
    end if;

    new.role := old.role;
    new.credits := old.credits;
    new.consultas := old.consultas;
    new.unlimited_until := old.unlimited_until;
    new.account_status := old.account_status;
    new.is_blocked := old.is_blocked;
    new.blocked_at := old.blocked_at;
    new.blocked_reason := old.blocked_reason;

    if new.email is not null then
      new.email := lower(trim(new.email));
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

revoke all on function public.protect_profiles_sensitive_fields() from public, anon, authenticated;

-- Funções internas não devem ser chamadas diretamente pelo navegador.
revoke all on function public.locacheck_force_initial_credits_5() from public, anon, authenticated;
revoke all on function public.ensure_profile_for_user(uuid, text) from public, anon, authenticated;

-- 4) Operação segura para o admin somar ou retirar créditos.
create or replace function public.admin_adjust_user_credits_v60(
  p_user_id uuid,
  p_delta integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old_credits integer;
  v_new_credits integer;
  v_applied_delta integer;
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'message', 'Apenas administradores podem alterar créditos.');
  end if;

  if p_user_id is null or p_delta is null or p_delta = 0 then
    return jsonb_build_object('success', false, 'message', 'Usuário ou quantidade inválida.');
  end if;

  select coalesce(credits, 0)
    into v_old_credits
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Usuário não encontrado.');
  end if;

  v_new_credits := greatest(0, v_old_credits + p_delta);
  v_applied_delta := v_new_credits - v_old_credits;

  update public.profiles
  set credits = v_new_credits
  where id = p_user_id;

  if v_applied_delta <> 0 then
    insert into public.credit_movements (
      user_id,
      amount,
      movement_type,
      description,
      related_user_id,
      created_at
    ) values (
      p_user_id,
      v_applied_delta,
      'admin_adjustment',
      'Ajuste manual de créditos realizado por administrador',
      auth.uid(),
      now()
    );
  end if;

  insert into public.activity_logs (user_id, action, details, created_at)
  values (
    auth.uid(),
    'creditos_alterados_v60',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'requested_delta', p_delta,
      'applied_delta', v_applied_delta,
      'old_credits', v_old_credits,
      'new_credits', v_new_credits
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_credits', v_old_credits,
    'new_credits', v_new_credits,
    'applied_delta', v_applied_delta
  );
end;
$$;

revoke all on function public.admin_adjust_user_credits_v60(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_adjust_user_credits_v60(uuid, integer) to authenticated;

-- 5) Operação segura para ativar ou cancelar acesso ilimitado.
create or replace function public.admin_set_user_unlimited_v60(
  p_user_id uuid,
  p_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old_until timestamptz;
  v_new_until timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'message', 'Apenas administradores podem alterar o plano ilimitado.');
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuário inválido.');
  end if;

  if p_days is not null and p_days > 365 then
    return jsonb_build_object('success', false, 'message', 'O período máximo permitido é de 365 dias.');
  end if;

  select unlimited_until
    into v_old_until
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Usuário não encontrado.');
  end if;

  if coalesce(p_days, 0) <= 0 then
    v_new_until := null;
  else
    v_new_until := now() + make_interval(days => p_days);
  end if;

  update public.profiles
  set unlimited_until = v_new_until
  where id = p_user_id;

  insert into public.activity_logs (user_id, action, details, created_at)
  values (
    auth.uid(),
    case when v_new_until is null then 'ilimitado_cancelado_v60' else 'ilimitado_ativado_v60' end,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'days', coalesce(p_days, 0),
      'old_unlimited_until', v_old_until,
      'new_unlimited_until', v_new_until
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'unlimited_until', v_new_until
  );
end;
$$;

revoke all on function public.admin_set_user_unlimited_v60(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_set_user_unlimited_v60(uuid, integer) to authenticated;

-- Reforça as funções administrativas já existentes.
revoke all on function public.admin_set_user_role(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;

commit;

notify pgrst, 'reload schema';

-- RESULTADO ESPERADO: false e false.
select
  has_function_privilege('authenticated', 'public.set_user_role_by_email(text,text)', 'EXECUTE')
    as usuario_autenticado_pode_promover_conta,
  has_function_privilege('anon', 'public.set_user_role_by_email(text,text)', 'EXECUTE')
    as visitante_pode_promover_conta;

