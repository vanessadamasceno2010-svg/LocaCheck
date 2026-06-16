# V29 — Correção do painel Consulta Externa

Esta versão corrige o erro de tela escura no painel admin e o erro `formatDate is not defined`.

## Ajustes realizados

- Adicionada função segura de formatação de data no front-end.
- Corrigido carregamento do painel `Consulta Externa` no admin.
- O painel agora carrega primeiro os logs externos e depois busca os perfis dos usuários separadamente, evitando erro de relacionamento no Supabase.
- Criada migração para garantir estrutura e permissões da tabela `external_consultation_logs`.
- Migração copia para `external_consultation_logs` os registros que ficaram apenas em `activity_logs`.

## Como aplicar

1. Rode `MIGRACAO-V29-CORRECAO-PAINEL-CONSULTA-EXTERNA.sql` no Supabase.
2. Suba este ZIP na branch `novo-layout-mobile`.
3. Faça deploy na Vercel.
4. Teste o painel admin > Consulta Externa.

## Teste esperado

- A tela não deve mais ficar preta.
- O painel Consulta Externa deve carregar histórico, créditos, cache e erros.
- O botão Atualizar externas deve funcionar.
