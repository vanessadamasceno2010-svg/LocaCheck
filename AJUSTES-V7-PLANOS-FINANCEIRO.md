# LocaCheck v7 — Planos e Financeiro

## O que foi corrigido

1. A aba **Planos** do painel admin agora carrega a tabela `plans` de forma compatível com o formato antigo (`price` e `plan_type`) e com o novo formato (`price_cents`, `active`, `is_unlimited`, `duration_days`).
2. O modal **Comprar Créditos** também foi ajustado para funcionar com os dois formatos da tabela `plans`.
3. A geração de PIX agora grava no pagamento:
   - créditos do plano;
   - tipo do plano;
   - valor em centavos;
   - plano vinculado.
4. A tela **Últimos pagamentos** no admin agora está preparada para mostrar:
   - nome do usuário;
   - nome do plano;
   - créditos reais do plano.

## Antes de testar

Rode o arquivo abaixo no Supabase SQL Editor:

`MIGRACAO-V7-PLANOS-FINANCEIRO.sql`

Depois faça deploy do código v7 na branch de teste.

## Testes

1. Entrar como admin.
2. Abrir a aba **Planos**.
3. Editar preço, créditos e ativação de um plano.
4. Entrar como usuário comum.
5. Comprar um plano via PIX.
6. Efetivar o pagamento.
7. Voltar no admin > Financeiro > Últimos pagamentos.
8. Verificar se aparece nome do usuário, nome do plano e créditos.
