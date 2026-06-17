-- V36 - Segurança de cadastro
-- Objetivo: impedir que novas contas criadas com qualquer e-mail recebam créditos automáticos.
-- Assim, usuário novo só consulta após comprar créditos ou receber liberação manual do administrador.

-- 1) Garante colunas simples para controle futuro de validação/aprovação.
alter table public.profiles
add column if not exists account_verified boolean default false;

alter table public.profiles
add column if not exists verified_at timestamptz;

alter table public.profiles
add column if not exists verified_by uuid;

-- 2) Novos perfis passam a ter 0 créditos por padrão.
alter table public.profiles
alter column credits set default 0;

-- 3) Força novos usuários comuns a nascerem com 0 créditos,
-- mesmo que algum trigger antigo tente inserir 10 créditos.
create or replace function public.locacheck_force_new_user_zero_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if coalesce(new.role, 'user') <> 'admin' and coalesce(new.credits, 0) > 0 then
    update public.profiles
       set credits = 0,
           account_verified = coalesce(account_verified, false)
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_locacheck_force_new_user_zero_credits on public.profiles;

create trigger zzz_locacheck_force_new_user_zero_credits
after insert on public.profiles
for each row
execute function public.locacheck_force_new_user_zero_credits();

-- 4) Função opcional para administrador liberar manualmente um usuário e dar créditos iniciais, se quiser.
create or replace function public.admin_verify_user_and_add_credits(target_user uuid, initial_credits int default 0)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set account_verified = true,
         verified_at = now(),
         verified_by = auth.uid(),
         credits = greatest(0, coalesce(credits, 0) + greatest(initial_credits, 0))
   where id = target_user;
end;
$$;

notify pgrst, 'reload schema';
