-- LocaCheck V9
-- Objetivo: manter o bucket records público e garantir que documentos/comprovantes
-- apareçam no resultado da consulta de ocorrências aprovadas.
-- Rode no Supabase: SQL Editor > New query > Run.

-- 1) Mantém o bucket records como público.
update storage.buckets
set public = true
where id = 'records';

-- 2) Garante uma política de upload segura para usuários autenticados.
-- O app já salva os arquivos dentro da pasta com o id do usuário.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own record documents'
  ) then
    create policy "Users can upload own record documents"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'records'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can read public record documents'
  ) then
    create policy "Users can read public record documents"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'records');
  end if;
end $$;

-- 3) Atualiza a função de consulta para devolver imagem_url/documento_url.
-- Assim, quando a ocorrência aprovada tiver documento/comprovante, o app mostra o botão para abrir.
create or replace function public.secure_consult_renter(p_search text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_search text := trim(coalesce(p_search, ''));
  v_digits text := regexp_replace(trim(coalesce(p_search, '')), '\D', '', 'g');
  v_profile record;
  v_unlimited boolean := false;
  v_credit_charged boolean := false;
  v_results jsonb := '[]'::jsonb;
  v_results_count integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Entre na sua conta para realizar a consulta.'
    );
  end if;

  if length(v_search) < 2 then
    return jsonb_build_object(
      'success', false,
      'message', 'Digite pelo menos 2 caracteres para consultar.'
    );
  end if;

  select id, credits, consultas, unlimited_until
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'Perfil não encontrado. Saia e entre novamente.'
    );
  end if;

  v_unlimited := v_profile.unlimited_until is not null and v_profile.unlimited_until > now();

  if not v_unlimited and coalesce(v_profile.credits, 0) <= 0 then
    return jsonb_build_object(
      'success', false,
      'message', 'Você não possui créditos disponíveis. Compre créditos para continuar.'
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
  into v_results
  from (
    select
      rec.id,
      rec.nome,
      coalesce(rec.cpf4, right(regexp_replace(coalesce(rec.cpf_full, ''), '\D', '', 'g'), 4)) as cpf4,
      case
        when coalesce(rec.cpf4, right(regexp_replace(coalesce(rec.cpf_full, ''), '\D', '', 'g'), 4)) <> ''
          then '***.***.***-' || coalesce(rec.cpf4, right(regexp_replace(coalesce(rec.cpf_full, ''), '\D', '', 'g'), 4))
        else 'CPF não informado'
      end as cpf_masked,
      rec.cidade,
      rec.tipos,
      rec.descricao,
      rec.imagem_url,
      rec.imagem_url as documento_url,
      rec.created_at,
      rec.approved_at
    from public.records rec
    where lower(coalesce(rec.status, '')) = 'aprovado'
      and (
        lower(coalesce(rec.nome, '')) like '%' || lower(v_search) || '%'
        or (
          length(v_digits) >= 4
          and right(regexp_replace(coalesce(rec.cpf_full, ''), '\D', '', 'g'), 4) = right(v_digits, 4)
        )
        or (
          length(v_digits) >= 4
          and coalesce(rec.cpf4, '') = right(v_digits, 4)
        )
      )
    order by rec.approved_at desc nulls last, rec.created_at desc nulls last
    limit 20
  ) r;

  v_results_count := jsonb_array_length(v_results);

  if not v_unlimited then
    update public.profiles
    set credits = greatest(coalesce(credits, 0) - 1, 0),
        consultas = coalesce(consultas, 0) + 1
    where id = v_user_id;

    v_credit_charged := true;
  else
    update public.profiles
    set consultas = coalesce(consultas, 0) + 1
    where id = v_user_id;
  end if;

  insert into public.consultation_logs (
    user_id,
    searched_text,
    searched_cpf,
    results_count,
    credit_charged,
    used_unlimited,
    created_at
  ) values (
    v_user_id,
    v_search,
    nullif(v_digits, ''),
    v_results_count,
    v_credit_charged,
    v_unlimited,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Consulta realizada com sucesso.',
    'results', v_results,
    'results_count', v_results_count,
    'credit_charged', v_credit_charged,
    'used_unlimited', v_unlimited
  );
end;
$$;
