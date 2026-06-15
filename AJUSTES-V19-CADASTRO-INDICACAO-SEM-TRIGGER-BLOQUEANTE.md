# V19 - Correção do cadastro por link de indicação

Esta versão corrige o erro:

> database error saving new user

O erro acontecia porque havia trigger de indicação rodando dentro do Supabase Auth. Se qualquer parte do bônus/log falhasse, o cadastro inteiro era cancelado.

## O que mudou

- Removidos triggers de indicação em `auth.users` e `profiles`.
- Cadastro volta a ser salvo normalmente.
- Bônus de indicação passa a ser aplicado após o cadastro pela rota segura `/api/referrals/claim` da Vercel.
- Função `service_claim_referral_bonus` foi recriada de forma mais segura.
- Erro de log não bloqueia mais o crédito.
- Função de reprocessamento manual foi criada novamente.

## O que fazer

1. Rodar `MIGRACAO-V19-CADASTRO-INDICACAO-SEM-TRIGGER-BLOQUEANTE.sql` no Supabase.
2. Subir o código na branch `novo-layout-mobile`.
3. Fazer novo deploy na Vercel.
4. Testar novo cadastro por link de indicação com e-mail novo.

## Teste manual

Depois de rodar o SQL, é possível reprocessar cadastros pendentes com:

```sql
select public.reprocess_pending_referral_bonuses();
```

