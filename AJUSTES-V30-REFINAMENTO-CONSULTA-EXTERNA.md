# V30 — Refinamento da Consulta Externa

## O que foi ajustado

- Melhor organização do resultado externo exibido ao usuário.
- Resultado dividido em blocos:
  - Dados cadastrais
  - Indicadores de processos
  - Consumo da consulta
- Adicionado botão **Copiar resumo** no resultado da consulta externa.
- Adicionado histórico **Consultas Externas** no painel do usuário.
- Painel admin de Consulta Externa com filtros por:
  - usuário/e-mail/CPF final
  - tipo da consulta
  - cache sim/não
- Melhor indicação visual de resultado reaproveitado do cache.

## Banco de dados

Esta versão não exige nova migração obrigatória caso a V29 já esteja aplicada.

## Testes recomendados

1. Realizar Consulta Externa Básica.
2. Ver resultado em blocos.
3. Clicar em Copiar resumo.
4. Abrir painel do usuário > Consultas Externas.
5. Abrir admin > Consulta Externa.
6. Testar filtros por tipo, cache e CPF final.
