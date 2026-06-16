-- V22 - Novo usuário recebe 10 créditos iniciais
-- Rode este arquivo no Supabase > SQL Editor.
-- Não altera usuários antigos. Vale para novos cadastros a partir de agora.

-- Garante que, quando houver default no banco, o padrão seja 10.
alter table public.profiles
alter column credits set default 10;

-- Recria a proteção do perfil com o novo saldo inicial de 10 créditos.
create or replace function public.protect_profiles_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin, service_role e operações internas podem alterar campos sensíveis.
  if current_user = 'postgres'
     or current_user = 'service_role'
     or current_setting('request.jwt.claim.role', true) = 'service_role'
     or public.is_admin()
  then
    return new;
  end if;

  -- Usuário comum não escolhe role, créditos, consultas ou ilimitado no cadastro.
  if tg_op = 'INSERT' then
    new.role := 'user';
    new.credits := 10;
    new.consultas := 0;
    new.unlimited_until := null;
    return new;
  end if;

  -- Usuário comum pode atualizar dados básicos, mas não campos sensíveis.
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

-- Garante que o trigger exista.
drop trigger if exists protect_profiles_sensitive_fields_trigger on public.profiles;

create trigger protect_profiles_sensitive_fields_trigger
before insert or update on public.profiles
for each row
execute function public.protect_profiles_sensitive_fields();
