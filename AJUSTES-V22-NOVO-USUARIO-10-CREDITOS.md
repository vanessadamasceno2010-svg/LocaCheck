# V22 — Novo usuário com 10 créditos iniciais

## O que foi alterado

A plataforma foi ajustada para que cada novo usuário receba **10 créditos iniciais**, em vez de 20.

Foram atualizados:

- criação do perfil no `src/App.jsx`;
- mensagem de cadastro realizado;
- textos da tela inicial;
- texto da tela de cadastro;
- regra do Supabase para proteger o saldo inicial no banco.

## Migração necessária

Rode no Supabase:

`MIGRACAO-V22-NOVO-USUARIO-10-CREDITOS.sql`

Caminho:

`Supabase > SQL Editor > New query > colar conteúdo > Run`

## Importante

Essa migração **não altera usuários antigos**. Ela afeta apenas novos cadastros feitos depois da atualização.

## Como testar

1. Suba a V22 na branch de teste `novo-layout-mobile`.
2. Rode o SQL da V22 no Supabase.
3. Cadastre um usuário novo com e-mail ainda não usado.
4. Abra a tabela `profiles`.
5. Confira se o novo usuário entrou com `credits = 10`.
6. Veja se a tela inicial e a tela de cadastro mostram 10 créditos grátis.

## Publicação

Teste primeiro na Vercel pela branch de teste. Depois publique na produção somente se o cadastro novo estiver criando o perfil com 10 créditos.
