-- V38 — Segurança e controle de uso
-- Rode este SQL no Supabase antes de subir a V38.
-- Objetivo: impedir consultas por contas bloqueadas/suspeitas, manter novos usuários sem créditos grátis
-- e permitir que o admin bloqueie/libere usuários pelo painel.

alter table public.profiles
add column if not exists account_status text default 'ativo';

alter table public.profiles
add column if not exists is_blocked boolean default false;

alter table public.profiles
add column if not exists blocked_reason text;

alter table public.profiles
add column if not exists blocked_at timestamptz;

alter table public.profiles
add column if not exists blocked_by uuid;

alter table public.profiles
add column if not exists security_notes text;

update public.profiles
set
  account_status = coalesce(account_status, 'ativo'),
  is_blocked = coalesce(is_blocked, false),
  credits = coalesce(credits, 0)
where account_status is null
   or is_blocked is null
   or credits is null;

-- Garante que novos usuários não ganhem crédito automático.
create or replace function public.ensure_new_profile_security_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.credits := coalesce(new.credits, 0);
  if new.credits > 0 then
    new.credits := 0;
  end if;

  new.consultas := coalesce(new.consultas, 0);
  new.account_status := coalesce(new.account_status, 'ativo');
  new.is_blocked := coalesce(new.is_blocked, false);

  return new;
end;
$$;

drop trigger if exists trg_profiles_v38_security_defaults on public.profiles;
create trigger trg_profiles_v38_security_defaults
before insert on public.profiles
for each row
execute function public.ensure_new_profile_security_defaults();

-- Função para admin bloquear/liberar usuário.
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_status text;
begin
  select role into v_admin_role
  from public.profiles
  where id = auth.uid();

  if coalesce(v_admin_role, 'user') <> 'admin' then
    return jsonb_build_object('success', false, 'message', 'Apenas administradores podem alterar status de usuários.');
  end if;

  v_status := lower(trim(coalesce(p_status, 'ativo')));

  if v_status not in ('ativo', 'bloqueado', 'pendente') then
    return jsonb_build_object('success', false, 'message', 'Status inválido. Use ativo, bloqueado ou pendente.');
  end if;

  if p_user_id = auth.uid() and v_status <> 'ativo' then
    return jsonb_build_object('success', false, 'message', 'Você não pode bloquear sua própria conta administrativa.');
  end if;

  update public.profiles
  set
    account_status = v_status,
    is_blocked = (v_status = 'bloqueado'),
    blocked_reason = case when v_status = 'bloqueado' then nullif(trim(coalesce(p_reason, '')), '') else null end,
    blocked_at = case when v_status = 'bloqueado' then now() else null end,
    blocked_by = case when v_status = 'bloqueado' then auth.uid() else null end
  where id = p_user_id;

  insert into public.activity_logs (user_id, action, details)
  values (
    auth.uid(),
    'admin_user_status_changed',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'status', v_status,
      'reason', p_reason
    )
  );

  return jsonb_build_object('success', true, 'message', 'Status do usuário atualizado.');
end;
$$;

grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;

-- Índices para facilitar auditoria no painel.
create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_profiles_is_blocked on public.profiles(is_blocked);
create index if not exists idx_activity_logs_action_created_at on public.activity_logs(action, created_at desc);

notify pgrst, 'reload schema';
