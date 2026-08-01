# LocaCheck V61 — cadastro seguro, saldo zero e demonstração

## Resultado desta versão

A V61 parte da contenção de segurança da V60 e acrescenta:

- novos usuários comuns começam com **0 créditos**;
- nenhum saldo de usuário existente é alterado automaticamente;
- confirmação do e-mail obrigatória antes de abrir o painel;
- bloqueio de consultas internas, externas, processos e criação de PIX sem e-mail confirmado;
- botão para reenviar o e-mail de confirmação;
- consulta demonstrativa usando somente nomes, CPF, contatos, endereços e processos fictícios;
- demonstração não chama BigDataCorp, não consome crédito e não grava consulta;
- WhatsApp com formato válido e sem duplicidade entre novas contas;
- painel admin mostra se o e-mail está confirmado ou pendente;
- remoção da rota antiga de indicação;
- remoção, via SQL, dos triggers e funções que poderiam conceder bônus de indicação;
- histórico antigo de indicações preservado apenas para auditoria.

## Arquivos principais alterados

- `src/App.jsx`
- `src/App.css`
- `api/bigdata/process-consult.js`
- `api/pushinpay/create-pix.js`
- `api/referrals/claim.js` — removido porque o programa já estava desativado.
- `MIGRACAO-V60A-CONTENCAO-E-FUNCOES-SEGURAS.sql` — saldo inicial ajustado para zero antes da publicação.
- `MIGRACAO-V61-CADASTRO-ZERO-EMAIL-INDICACAO.sql` — nova migração separada.

## O que não foi alterado

- PushinPay e seu webhook;
- valores e quantidade de créditos dos planos;
- credenciais BigDataCorp;
- bucket público `records`;
- usuários, pagamentos, consultas ou saldos existentes;
- variáveis de ambiente;
- aplicativo Android nativo/Capacitor.

## Migrações necessárias

Sim. Existem três arquivos de segurança no pacote, com finalidades diferentes:

1. `MIGRACAO-V60A-CONTENCAO-E-FUNCOES-SEGURAS.sql`
   - corrige a falha de alteração de créditos;
   - cria operações administrativas seguras;
   - cria eventos de segurança.

2. `MIGRACAO-V61-CADASTRO-ZERO-EMAIL-INDICACAO.sql`
   - novos cadastros começam com zero;
   - remove o bônus de indicação;
   - impede WhatsApp duplicado;
   - protege a consulta interna sem e-mail confirmado;
   - mostra confirmação do e-mail no painel admin.

3. `MIGRACAO-V60B-BLOQUEIO-DIRETO-DE-CREDITOS.sql`
   - fecha a atualização direta de créditos pela API;
   - deve ser executada somente depois que o código V61 já estiver publicado e as funções do admin tiverem sido testadas.

Não execute os três arquivos de uma vez. Siga a ordem orientada durante o teste.

## Configuração obrigatória do Supabase

Depois de validar o Preview e antes do teste final de cadastro:

1. Abra o Supabase.
2. Entre no projeto LocaCheck.
3. Abra `Authentication`.
4. Entre em `Providers`.
5. Abra `Email`.
6. Ative `Confirm email`.
7. Salve.

Sem essa opção, o Supabase pode considerar qualquer e-mail automaticamente confirmado. O código não consegue substituir essa configuração do provedor.

## Como enviar ao GitHub

Use a branch de teste `novo-layout-mobile`.

1. Abra o repositório LocaCheck no GitHub.
2. Confirme no seletor superior que a branch é `novo-layout-mobile`.
3. Clique em `Add file` e depois `Upload files`.
4. Extraia o ZIP V61 no computador.
5. Envie o conteúdo de dentro da pasta V61, mantendo as pastas `src`, `api`, `android` e `.github`.
6. Não envie a pasta `node_modules`.
7. No campo de mensagem use:

   `V61 - cadastro seguro, saldo zero e demonstração`

8. Clique em `Commit changes` diretamente na branch `novo-layout-mobile`.

## Primeira fase de testes no Preview da Vercel — sem SQL

1. Aguarde o deploy da branch `novo-layout-mobile`.
2. Abra o novo endereço de Preview gerado pela Vercel.
3. Não promova o deploy para produção.
4. Confira a tela inicial.
5. Clique em `Ver consulta demonstrativa`.
6. Confirme que os dados estão marcados como fictícios.
7. Teste a rolagem e o fechamento no computador e no celular.
8. Abra `Entrar` e confirme que também existe o link da demonstração.
9. Entre com sua conta admin existente.
10. Confira se o painel, usuários, planos, pagamentos e consultas continuam abrindo.

Nesta primeira fase, não use um novo cadastro para conferir o saldo. A regra definitiva de zero depende da migração V61.

## Segunda fase — SQL e confirmação do e-mail

Somente depois que a primeira fase estiver aprovada:

1. Execute a V60A no SQL Editor do Supabase.
2. Execute a V61 no SQL Editor do Supabase.
3. Ative `Confirm email` no Supabase.
4. Crie uma conta de teste com um e-mail ao qual você tenha acesso.
5. Confirme que não é possível entrar antes de clicar no link recebido.
6. Use o botão de reenvio e confirme que ele funciona.
7. Confirme o e-mail.
8. Entre e verifique saldo inicial de `0 créditos`.
9. Confira no admin `Confirmação do e-mail: Confirmado`.
10. Tente cadastrar outra conta usando o mesmo WhatsApp e confirme o bloqueio.
11. Teste uma compra PIX sem concluir o pagamento.
12. Teste os botões de `+10` e `-10 créditos` do admin.

## Terceira fase — bloqueio direto

Depois de confirmar que o admin altera créditos corretamente pelas novas funções:

1. Execute `MIGRACAO-V60B-BLOQUEIO-DIRETO-DE-CREDITOS.sql`.
2. Teste novamente `+10` e `-10 créditos`.
3. Teste uma consulta com uma conta que possua créditos.
4. Confira pagamentos e logs.

## Publicação em produção

Somente depois de todos os testes:

1. Abra um Pull Request de `novo-layout-mobile` para `main`.
2. Revise se o PR contém somente os arquivos da V61.
3. Faça o merge.
4. Aguarde o deploy da `main` na Vercel.
5. Confira se o deploy correto foi promovido para produção.
6. Abra uma janela anônima e repita cadastro, confirmação, login, demonstração e consulta.

## CAPTCHA

O Cloudflare Turnstile não foi ativado nesta versão porque primeiro é necessário criar as chaves do site. Ele será implementado na próxima etapa, com as variáveis explicadas antes de alterar a Vercel ou o Supabase.

## Validação realizada

- `npm run build`: aprovado.
- sintaxe de `process-consult.js`: aprovada.
- sintaxe de `create-pix.js`: aprovada.
- busca por mensagens antigas de 5/10 créditos grátis no código ativo: nenhuma ocorrência.

