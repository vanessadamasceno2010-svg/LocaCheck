# V16 - Correção das indicações por trigger do Supabase Auth

## O que mudou

Esta versão corrige o bônus de indicação de forma mais forte:

- O bônus agora também é processado por trigger diretamente em `auth.users` quando o cadastro é criado.
- O sistema tenta aplicar a indicação mesmo que a rota da Vercel falhe.
- Cadastros antigos feitos pelo link, mas que ainda não deram bônus, podem ser reprocessados pelo SQL da v16.
- Removida qualquer mensagem de destaque na tela de cadastro informando bônus para quem indicou.

## Antes de subir

Rode no Supabase:

`MIGRACAO-V16-CORRECAO-INDICACOES-AUTH-TRIGGER.sql`

Depois suba o projeto na branch de teste.

## Teste

1. Entre com usuário A.
2. Copie o link de indicação.
3. Abra em aba anônima.
4. Cadastre usuário B.
5. Confirme e faça login, se o Supabase pedir confirmação.
6. Volte no usuário A e atualize o painel.
7. Confira +2 créditos, movimentação e log admin.
