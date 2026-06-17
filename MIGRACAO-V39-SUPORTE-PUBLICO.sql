-- V39 - Suporte público na tela inicial
-- Permite que visitantes enviem mensagem para o painel de suporte do admin.

alter table public.support_messages
add column if not exists contact_name text;

alter table public.support_messages
add column if not exists contact_email text;

alter table public.support_messages
add column if not exists contact_whatsapp text;

alter table public.support_messages
add column if not exists status text default 'novo';

alter table public.support_messages
add column if not exists created_at timestamptz default now();

-- Garante que mensagens vindas da tela inicial possam entrar sem usuário logado.
do $$
begin
  begin
    alter table public.support_messages alter column user_id drop not null;
  exception when others then
    null;
  end;
end $$;

alter table public.support_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
      and policyname = 'public_can_create_support_message_v39'
  ) then
    create policy public_can_create_support_message_v39
    on public.support_messages
    for insert
    to anon, authenticated
    with check (true);
  end if;
end $$;

create index if not exists idx_support_messages_status_created_at
on public.support_messages(status, created_at desc);

notify pgrst, 'reload schema';
