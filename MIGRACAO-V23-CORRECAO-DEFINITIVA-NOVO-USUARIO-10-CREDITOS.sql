-- V23 - Correção definitiva: novo usuário recebe 10 créditos
-- Rode este arquivo no Supabase > SQL Editor.
-- Motivo: algum trigger/função antiga ainda estava criando profiles com 20 créditos.
-- Esta migração força 10 créditos em TODO novo profile de usuário comum, mesmo quando o profile é criado por trigger interno do Supabase/Auth.

-- 1) Mantém o padrão da coluna como 10.
alter table public.profiles
alter column credits set default 10;

-- 2) Garante role/consultas básicos e impede que usuário comum altere campos sensíveis.
create or replace function public.protect_profiles_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Operações internas/admin podem seguir normalmente; a trava definitiva de crédito inicial fica em outro trigger abaixo.
  if current_user = 'postgres'
     or current_user = 'service_role'
     or current_setting('request.jwt.claim.role', true) = 'service_role'
     or public.is_admin()
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := coalesce(new.role, 'user');
    new.credits := 10;
    new.consultas := 0;
    new.unlimited_until := null;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.credits := old.credits;
    new.consultas := old.consultas;
    new.unlimited_until := old.unlimited_until;
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

-- 3) Correção definitiva para profiles criados por triggers internos/serviço.
-- Este trigger NÃO ignora service_role. Ele roda para qualquer insert em profiles.
-- Se for usuário comum e vier com 20 créditos, null ou 0, ajusta para 10.
create or replace function public.force_new_user_initial_credits_10()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := coalesce(new.role, 'user');
  new.consultas := coalesce(new.consultas, 0);

  -- Para novo usuário comum, força 10 créditos iniciais.
  -- Mantém créditos diferentes de 0/10/20 caso algum admin/função crie profile especial manualmente.
  if lower(coalesce(new.role, 'user')) = 'user'
     and coalesce(new.consultas, 0) = 0
     and coalesce(new.credits, 0) in (0, 10, 20)
  then
    new.credits := 10;
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_force_new_user_initial_credits_10_trigger on public.profiles;

-- O prefixo zzz ajuda este trigger a rodar depois dos outros triggers BEFORE INSERT da tabela profiles.
create trigger zzz_force_new_user_initial_credits_10_trigger
before insert on public.profiles
for each row
execute function public.force_new_user_initial_credits_10();

-- 4) Log simples para confirmar que a migração foi aplicada.
insert into public.activity_logs (user_id, action, details, created_at)
values (
  auth.uid(),
  'migration_v23_new_user_10_credits_applied',
  jsonb_build_object('initial_credits', 10, 'applied_at', now()),
  now()
)
on conflict do nothing;

-- 5) Diagnóstico: mostra se o default ficou 10.
select
  column_default as credits_column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'credits';
