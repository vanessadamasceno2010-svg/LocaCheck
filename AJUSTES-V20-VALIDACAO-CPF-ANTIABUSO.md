# LocaCheck v20 — Validação de CPF e Anti-abuso

## O que foi ajustado

- Validação de CPF no formulário de ocorrência.
- Máscara de CPF no campo de cadastro de ocorrência.
- Máscara de WhatsApp no campo de ocorrência.
- Bloqueio de ocorrência com CPF inválido.
- Bloqueio de descrição muito curta.
- Bloqueio de consulta por CPF incompleto/inválido.
- Limite de consultas em sequência para reduzir abuso.
- Limite diário/mensal de bônus por indicação para reduzir criação massiva de contas.
- Logs de bloqueio por excesso de consulta/indicação no painel admin.

## Antes de subir o código

Rode no Supabase:

`MIGRACAO-V20-VALIDACAO-CPF-E-ANTIABUSO.sql`

## Testes necessários

1. Tentar cadastrar ocorrência com CPF inválido. Deve bloquear.
2. Cadastrar ocorrência com CPF válido. Deve funcionar.
3. Consultar por CPF incompleto. Deve bloquear.
4. Consultar por CPF válido. Deve funcionar.
5. Testar cadastro por link de indicação. Deve continuar funcionando.
6. Abrir Admin > Auditoria e verificar se os logs continuam aparecendo.

## Próximo passo sugerido

Depois da v20, avançar para acabamento final de publicação:

- revisão visual final no celular;
- textos finais da landing;
- checklist de produção;
- publicar branch principal;
- monitorar pagamentos, consultas, logs e cadastros nos primeiros dias.
