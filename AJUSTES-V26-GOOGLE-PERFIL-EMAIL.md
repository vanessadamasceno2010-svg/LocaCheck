# V26 — Ajuste login Google, perfil e e-mail

## O que foi corrigido

- Login com Google agora sincroniza melhor o perfil do usuário.
- A tabela `profiles` passa a ter coluna `email`.
- O nome do Google é salvo no perfil quando possível.
- O e-mail do Google é salvo no perfil.
- Se o usuário Google existir em Authentication mas não existir em `profiles`, o app cria o perfil automaticamente.
- Novos usuários continuam recebendo 10 créditos.

## Importante no Supabase

Em Authentication > URL Configuration, altere a URL do site. Não deixe como `http://localhost:3000` em produção.

Use:

`https://local-check.vercel.app`

Em Redirect URLs, mantenha:

`https://local-check.vercel.app`
`https://local-check.vercel.app/**`

## SQL necessário

Rode o arquivo:

`MIGRACAO-V26-GOOGLE-PERFIL-EMAIL.sql`

## Como testar

1. Rode o SQL.
2. Suba a V26 na branch de teste.
3. Faça deploy na Vercel.
4. Saia da conta.
5. Clique em Entrar com Google.
6. Após retornar ao site, confira se abriu o painel.
7. Confira em Supabase > Authentication > Users se aparece Provider Google.
8. Confira em Table Editor > profiles se o e-mail foi salvo.
