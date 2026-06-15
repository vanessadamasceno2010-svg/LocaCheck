# V18 - Auditoria e policies finais

Esta versão organiza a segurança das tabelas de auditoria, suporte, movimentações de crédito e logs da PushinPay.

## O que foi feito

- Protege `activity_logs` para apenas admin visualizar/inserir logs pelo app.
- Organiza `credit_movements` para usuário ver apenas suas próprias movimentações.
- Organiza `support_messages` para usuário ver/enviar apenas suas próprias mensagens e admin responder/atualizar.
- Protege `pushinpay_webhook_logs` para apenas admin visualizar no painel.
- Remove policies antigas/duplicadas dessas tabelas e recria policies limpas.

## Como aplicar

1. Rode `MIGRACAO-V18-AUDITORIA-E-POLICIES-FINAIS.sql` no Supabase SQL Editor.
2. Faça redeploy da branch `novo-layout-mobile` se tiver subido este pacote.
3. Teste:
   - Usuário comum envia suporte.
   - Usuário comum vê movimentações de indicação/crédito.
   - Admin vê logs em Auditoria.
   - Admin atualiza suporte.
   - Pagamento PushinPay continua funcionando.

## Próximo passo após v18

Validação e proteção contra abuso:

- Validar CPF de verdade antes de cadastrar ocorrência.
- Limitar tentativas de consulta repetidas.
- Evitar criação massiva de contas só para bônus de indicação.
- Definir política clara para bônus por indicação.
