# LocaCheck V45 — Correção da migração dos logs externos

## Motivo da V45

A migração V44 tentou copiar consultas antigas de `activity_logs` para `external_consultation_logs`.
Um desses registros possuía um `user_id` que já não existe em `auth.users`, e a chave estrangeira bloqueou o comando com o erro `23503`.

Isso não significa que o usuário atual ou o cadastro estejam com defeito. É apenas um vínculo histórico órfão.

## O que foi corrigido

- A chave estrangeira de `external_consultation_logs.user_id` é recriada apontando explicitamente para `auth.users(id)`.
- Logs antigos cujo usuário já foi removido são preservados com `user_id` nulo.
- O histórico não é apagado.
- A cópia dos registros de `activity_logs` não bloqueia mais toda a migração.
- Tipos antigos ou inesperados de consulta são normalizados para `external_advanced`.
- Todos os ajustes funcionais da V44 continuam incluídos.

## SQL obrigatório

Rode somente o arquivo:

`MIGRACAO-V45-CORRECAO-FK-LOGS-EXTERNOS.sql`

Caminho: Supabase → SQL Editor → New query → cole todo o conteúdo → Run.

O arquivo é idempotente: pode ser executado mesmo que parte da V44 tenha sido aplicada antes do erro.

## O que esta migração não altera

- PushinPay, pagamentos e planos.
- Variáveis de ambiente.
- Bucket `records`.
- Usuários existentes e seus saldos atuais.
- Triggers de `auth.users` para criar bônus; nenhuma trigger bloqueante é criada.

## Teste na branch

Use a branch `novo-layout-mobile`. Depois de executar o SQL, faça uma Consulta Externa no Preview da Vercel e confirme no admin:

1. Card com título `Consulta Externa`.
2. CPF completo.
3. Créditos consumidos.
4. Saldo depois da consulta.
5. Nome e e-mail do usuário atual.

Consultas históricas de usuários já apagados podem aparecer sem nome/e-mail, pois não é seguro associá-las a outra conta.

## Publicação

Não faça merge em `main` antes de testar cadastro com 5 créditos, consulta interna, consulta externa, compra de créditos e painel admin no Preview da Vercel.
