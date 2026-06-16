-- V27 - Gerenciar administradores pelo e-mail e pelo painel admin
-- Rode no Supabase > SQL Editor > New query > Run

-- 1) Garante coluna de e-mail na tabela de perfis
alter table public.profiles
add column if not exists email text;

-- 2) Preenche e-mails já existentes a partir do Supabase Auth
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create index if not exists profiles_email_idx
on public.profiles (lower(email));

-- 3) Função segura para o painel admin alterar usuário comum/admin
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(trim(coalesce(p_role, 'user')));
  v_old_role text;
  v_user_email text;
  v_user_nome text;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'message', 'Apenas administradores podem alterar perfil de acesso.');
  end if;

  if v_role not in ('user', 'admin') then
    return jsonb_build_object('success', false, 'message', 'Perfil inválido. Use user ou admin.');
  end if;

  if p_user_id = auth.uid() and v_role <> 'admin' then
    return jsonb_build_object('success', false, 'message', 'Você não pode remover seu próprio acesso de administrador pelo painel.');
  end if;

  select role, email, nome
    into v_old_role, v_user_email, v_user_nome
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Usuário não encontrado na tabela profiles.');
  end if;

  update public.profiles
  set role = v_role
  where id = p_user_id;

  insert into public.activity_logs (user_id, action, details, created_at)
  values (
    auth.uid(),
    'usuario_role_alterado',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_user_email,
      'target_nome', v_user_nome,
      'old_role', v_old_role,
      'new_role', v_role
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Perfil atualizado com sucesso.',
    'user_id', p_user_id,
    'role', v_role
  );
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 4) Função prática para você alterar admin por e-mail direto no SQL Editor.
-- Exemplo de uso:
-- select public.set_user_role_by_email('email@exemplo.com', 'admin');
-- select public.set_user_role_by_email('email@exemplo.com', 'user');
create or replace function public.set_user_role_by_email(
  p_email text,
  p_role text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'admin')));
  v_user_id uuid;
  v_old_role text;
begin
  if v_email = '' then
    return jsonb_build_object('success', false, 'message', 'Informe um e-mail.');
  end if;

  if v_role not in ('user', 'admin') then
    return jsonb_build_object('success', false, 'message', 'Perfil inválido. Use user ou admin.');
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'E-mail não encontrado no Supabase Auth.');
  end if;

  insert into public.profiles (id, nome, email, whatsapp, role, credits, consultas)
  select
    u.id,
    coalesce(nullif(u.raw_user_meta_data->>'nome', ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Usuário'),
    lower(u.email),
    coalesce(u.raw_user_meta_data->>'whatsapp', ''),
    'user',
    10,
    0
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do update
    set email = excluded.email;

  select role into v_old_role
  from public.profiles
  where id = v_user_id;

  update public.profiles
  set role = v_role,
      email = v_email
  where id = v_user_id;

  insert into public.activity_logs (user_id, action, details, created_at)
  values (
    v_user_id,
    'usuario_role_alterado_por_email',
    jsonb_build_object(
      'target_user_id', v_user_id,
      'target_email', v_email,
      'old_role', v_old_role,
      'new_role', v_role,
      'source', 'sql_editor'
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Perfil atualizado com sucesso.',
    'user_id', v_user_id,
    'email', v_email,
    'role', v_role
  );
end;
$$;

grant execute on function public.set_user_role_by_email(text, text) to authenticated;

-- 5) Opcional: se existir tabela traduzida "perfis", cria coluna email nela também.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'perfis'
  ) then
    execute 'alter table public.perfis add column if not exists email text';
  end if;
end $$;
