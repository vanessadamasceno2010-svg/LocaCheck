# Ajustes V12 — Landing sem números fictícios

## O que foi ajustado

- Removida a chamada da função `public_landing_stats` na tela inicial.
- Removidos indicadores numéricos reais/automáticos da landing.
- Substituídos por cards de credibilidade sem números inventados:
  - Consulta preventiva
  - Histórico registrado
  - Ocorrência analisada
  - CPF protegido
- Mantida a exibição automática dos planos ativos cadastrados pelo admin.

## Por que foi feito assim

Não foram adicionados números fictícios como se fossem reais, para evitar risco de propaganda enganosa e problemas de confiança com usuários.

A página continua passando seriedade, mas com argumentos seguros e sustentáveis.

## Precisa rodar SQL?

Não. Esta versão não precisa de migração no Supabase.

Basta subir os arquivos na branch de teste e fazer novo deploy na Vercel.
