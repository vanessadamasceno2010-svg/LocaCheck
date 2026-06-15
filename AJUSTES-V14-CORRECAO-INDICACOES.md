# V14 - Correção do sistema de indicação

## Problema corrigido

Em alguns projetos o perfil do usuário é criado automaticamente pelo Supabase antes do front-end conseguir gravar o código de indicação. Quando isso acontecia, o link aparecia no painel, mas o bônus não era aplicado.

## O que mudou

- Criada a função segura `claim_referral_bonus` no Supabase.
- O app agora tenta aplicar a indicação pendente sempre que o usuário faz login ou carrega o perfil.
- O bônus é idempotente: não duplica créditos se o usuário atualizar a página ou logar novamente.
- O indicador recebe +2 créditos.
- A movimentação aparece em `credit_movements`.
- O admin vê o log `referral_bonus_granted` em `activity_logs`.

## Como testar

1. Rode `MIGRACAO-V14-CORRECAO-INDICACOES.sql` no Supabase.
2. Suba esta versão na branch de teste.
3. Entre com usuário A e copie o link de indicação.
4. Abra o link em aba anônima.
5. Cadastre usuário B.
6. Faça login com usuário B, se o sistema pedir confirmação de e-mail.
7. Volte no usuário A e confira se entraram +2 créditos.
8. Veja as movimentações no painel de indicação do usuário A.
9. Veja o log no painel admin.
