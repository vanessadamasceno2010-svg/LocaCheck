-- V26 - Ajuste para login com Google criar/sincronizar perfil e e-mail
-- Rode no Supabase > SQL Editor > New query > Run

alter table public.profiles
add column if not exists email text;

create index if not exists profiles_email_idx
on public.profiles (lower(email));

-- Preenche e-mails de perfis já existentes usando auth.users.
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '')
  and u.email is not null;

-- Garante que novos perfis criados pelo banco recebam e-mail, nome e 10 créditos.
create or replace function public.ensure_profile_for_user(p_user_id uuid, p_referral_code text default null)
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
    referral_code,
    referred_by_code
  ) values (
    p_user_id,
    v_name,
    nullif(v_email, ''),
    coalesce(v_user.raw_user_meta_data->>'whatsapp', ''),
    'user',
    10,
    0,
    'LC' || upper(substr(replace(p_user_id::text, '-', ''), 1, 10)),
    nullif(coalesce(p_referral_code, v_user.raw_user_meta_data->>'referral_code', v_user.raw_user_meta_data->>'ref'), '')
  )
  on conflict (id) do update
    set nome = case
          when public.profiles.nome is null or public.profiles.nome = '' or public.profiles.nome = 'Usuário'
          then excluded.nome
          else public.profiles.nome
        end,
        email = coalesce(public.profiles.email, excluded.email),
        whatsapp = coalesce(nullif(public.profiles.whatsapp, ''), excluded.whatsapp),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by_code = coalesce(public.profiles.referred_by_code, excluded.referred_by_code)
  returning * into v_profile;

  return v_profile;
end;
$$;

-- Ajusta a proteção de perfis para preservar 10 créditos no cadastro inicial comum.
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
    new.credits := 10;
    new.consultas := 0;
    new.unlimited_until := null;
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
