# LocaCheck V46 — Consultas por CPF, telefone, e-mail e processo

## O que foi alterado

- A Consulta Externa agora permite escolher CPF, telefone ou e-mail.
- Cada consulta retorna no máximo 1 pessoa.
- CPF, telefone e e-mail consomem 3 créditos.
- O crédito só é descontado quando a fonte externa retorna uma pessoa válida.
- A consulta de uma pessoa relacionada consome 3 créditos e começa diretamente, sem popup.
- A consulta completa de um processo consome 2 créditos.
- O processo sem resultado ou com erro não desconta créditos.
- A idade atual é calculada pela data de nascimento.
- Telefones e e-mails são exibidos em linhas simples, sem tipo, prioridade ou status.
- Pessoas relacionadas exibem nome completo, CPF, tipo de relacionamento, telefones e botão Consultar.
- Processos exibem o botão Consultar processo.
- A cobrança foi protegida no banco para evitar desconto duplicado por cliques simultâneos.
- Telefone e e-mail pesquisados ficam completos nos logs, conforme decisão do responsável pelo sistema.

## Arquivos principais alterados

- `src/App.jsx`
- `src/App.css`
- `api/bigdata/external-consult.js`
- `api/bigdata/process-consult.js`
- `MIGRACAO-V46-CONSULTAS-CPF-TELEFONE-EMAIL-PROCESSOS.sql`

## SQL obrigatório

Execute somente:

`MIGRACAO-V46-CONSULTAS-CPF-TELEFONE-EMAIL-PROCESSOS.sql`

No Supabase:

1. Abra o projeto.
2. Entre em `SQL Editor`.
3. Clique em `New query`.
4. Cole todo o conteúdo do arquivo SQL.
5. Clique em `Run`.
6. Confirme que apareceu `Success`.

O SQL não altera PushinPay, planos, autenticação, indicação nem o bucket `records`.

## Variáveis de ambiente

As variáveis existentes da BigDataCorp continuam iguais.

Para a consulta completa de processo, o sistema usa por padrão o dataset `processes`.
Se a sua conta usar outro nome de dataset para a API de Processos, crie na Vercel:

`BIGDATA_PROCESS_DATASETS`

e coloque exatamente o nome informado pela BigDataCorp. Não altere essa variável sem necessidade.

## Como enviar para a branch de teste pelo GitHub

1. Não envie diretamente para `main`.
2. Abra o repositório LocaCheck no GitHub.
3. Selecione a branch `novo-layout-mobile`.
4. Confirme no topo da página que essa branch está selecionada.
5. Clique em `Add file` e depois em `Upload files`.
6. Abra a pasta extraída `LocaCheck-V46`.
7. Envie o conteúdo da pasta, mantendo os mesmos caminhos.
8. Confirme o envio com a mensagem:

`V46 - consultas por CPF telefone email e processos`

9. Aguarde a Vercel criar o Preview dessa branch.

## Ordem segura para testar

1. Rode a migração V46 no Supabase.
2. Envie o código para `novo-layout-mobile`.
3. Abra somente o Preview da Vercel.
4. Use uma conta de teste com créditos.
5. Teste um CPF válido e confirme desconto de 3 créditos.
6. Teste um telefone válido e confirme desconto de 3 créditos.
7. Teste um e-mail válido e confirme desconto de 3 créditos.
8. Teste uma pesquisa sem resultado e confirme que nenhum crédito foi descontado.
9. Clique em Consultar numa pessoa relacionada e confirme desconto de 3 créditos.
10. Clique em Consultar processo e confirme desconto de 2 créditos.
11. Clique duas vezes rapidamente e confirme que não houve cobrança duplicada.
12. Confira idade, contatos, relacionamentos e detalhes do processo.
13. Confira os logs no painel admin.
14. Teste compra de créditos, consulta interna, login e painel admin para garantir que continuam funcionando.

## Publicação

Somente depois de todos os testes:

1. No GitHub, abra `Pull requests`.
2. Clique em `New pull request`.
3. Base: `main`.
4. Compare: `novo-layout-mobile`.
5. Revise os arquivos.
6. Faça o merge.
7. Aguarde o deploy de produção na Vercel.
8. Confirme que o deploy novo está como `Production`.

Se a atualização não aparecer, confira a branch enviada, o deploy promovido, eventual rollback e faça um novo deploy sem cache.

## Segurança e LGPD

Telefone e e-mail completos passam a ser registrados nos logs por decisão do responsável.
Esses dados não devem ser publicados, exportados ou compartilhados fora da finalidade legítima da LocaCheck.
Mantenha o painel administrativo restrito e revise periodicamente quem possui acesso de administrador.

