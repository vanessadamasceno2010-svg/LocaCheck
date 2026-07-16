# LocaCheck V43 — Painel admin, visitas e consulta combinada

## Objetivo desta versão

A V43 deixa o painel administrativo mais fácil de usar e acrescenta:

1. Uma nova **Visão geral** para o administrador.
2. Contagem de visitas do dia, últimos 7, 30 ou 90 dias.
3. Lista unificada das consultas internas e externas.
4. Identificação do usuário que realizou cada consulta.
5. CPF exibido no admin apenas pelo final, reduzindo exposição de dados.
6. Consulta Externa Completa verificando também a base interna.
7. Exibição separada dos resultados da fonte externa e da base interna.

## Regra de créditos da consulta combinada

A **Consulta Externa Completa continua custando 3 créditos no total**.

A verificação da base interna é incluída nessa consulta e **não desconta mais 1 crédito**.

A Consulta Interna feita separadamente continua custando 1 crédito, como antes.

## Arquivos alterados

### Código do site

- `src/App.jsx`
  - Novo menu administrativo agrupado.
  - Nova tela de resumo do admin.
  - Nova tela de visitas e consultas.
  - Filtros por período, tipo de consulta e usuário.
  - Exibição combinada da consulta externa e interna.

- `src/App.css`
  - Estilos do novo painel administrativo.
  - Gráfico simples de visitas por dia.
  - Identificação visual da base interna e da fonte externa.
  - Ajustes para celular.

### APIs da Vercel

- `api/analytics/visit.js`
  - Nova rota segura para contabilizar visitas.
  - Conta uma sessão do navegador no máximo uma vez por dia.
  - Não armazena IP, CPF ou parâmetros da URL.
  - Aceita apenas chamadas da própria origem do site.

- `api/bigdata/external-consult.js`
  - Após uma Consulta Externa Completa bem-sucedida, verifica a base interna.
  - Não cobra crédito adicional pela busca interna incluída.
  - Não devolve CPF completo nos resultados internos.
  - Evita misturar registros de pessoas diferentes que tenham os mesmos quatro números finais do CPF.

### Supabase

- `MIGRACAO-V43-PAINEL-ADMIN-VISITAS-E-CONSULTAS.sql`
  - Cria a tabela `site_visits`.
  - Acrescenta campos de identificação às consultas internas.
  - Cria a função segura `get_admin_activity_overview`.
  - Mantém RLS e acesso somente para administrador.

## Precisa rodar SQL no Supabase?

**Sim.**

O arquivo é:

`MIGRACAO-V43-PAINEL-ADMIN-VISITAS-E-CONSULTAS.sql`

### Onde colar

1. Entre no Supabase.
2. Abra o projeto do LocaCheck.
3. Clique em **SQL Editor**.
4. Clique em **New query**.
5. Abra o arquivo SQL da V43.
6. Copie todo o conteúdo.
7. Cole no SQL Editor.
8. Clique em **Run**.
9. Confirme que apareceu uma mensagem de sucesso.

Essa migração é aditiva. Ela não apaga dados existentes e não altera o funcionamento atual antes do código V43 ser publicado.

## O que não foi alterado

- PushinPay não foi alterado.
- Webhook de pagamento não foi alterado.
- Sistema de indicação não foi alterado.
- Nenhuma trigger foi criada em `auth.users`.
- Bucket público `records` não foi alterado.
- Login e autenticação Supabase não foram alterados.
- Nenhuma variável de ambiente nova foi criada.
- As variáveis existentes `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` continuam sendo usadas apenas nas rotas seguras da Vercel.

## Como subir no GitHub com segurança

Use a branch de teste:

`novo-layout-mobile`

### Pelo GitHub Desktop

1. Faça uma cópia de segurança da pasta atual do projeto.
2. Extraia o ZIP da V43.
3. Abra o repositório no GitHub Desktop.
4. Na parte superior, selecione a branch `novo-layout-mobile`.
5. Caso ela não exista, clique em **New Branch** e crie com esse nome.
6. Não selecione a branch `main` nesta etapa.
7. Substitua os arquivos do projeto pelos arquivos da pasta V43.
8. Volte ao GitHub Desktop.
9. Confira se somente os arquivos da V43 aparecem como alterados.
10. Use a mensagem:

`V43 - painel admin, visitas e consulta combinada`

11. Clique em **Commit to novo-layout-mobile**.
12. Clique em **Push origin**.

### Arquivos principais que devem aparecer no commit

- `src/App.jsx`
- `src/App.css`
- `api/bigdata/external-consult.js`
- `api/analytics/visit.js`
- `MIGRACAO-V43-PAINEL-ADMIN-VISITAS-E-CONSULTAS.sql`
- `AJUSTES-V43-PAINEL-ADMIN-VISITAS-E-CONSULTA-COMBINADA.md`

## Como testar na Vercel Preview

Depois do Push na branch `novo-layout-mobile`:

1. Abra a Vercel.
2. Entre no projeto LocaCheck.
3. Abra **Deployments**.
4. Procure o deploy da branch `novo-layout-mobile`.
5. Confirme que o status está como **Ready**.
6. Abra o endereço de Preview desse deploy.
7. Não promova para produção ainda.

## Checklist de testes obrigatórios

### 1. Painel administrativo

Entre com uma conta admin e confirme:

- O painel abre primeiro em **Visão geral**.
- Os menus estão agrupados por finalidade.
- Os botões funcionam no computador e no celular.
- Aparecem os cards de visitas, consultas, ocorrências e usuários.

### 2. Contagem de visitas

1. Abra o Preview em uma janela normal.
2. Abra também em uma janela anônima.
3. Entre no admin.
4. Abra **Visitas e consultas**.
5. Clique em **Atualizar atividade**.
6. Verifique se as visitas foram contabilizadas.

Observação: uma mesma sessão do navegador conta no máximo uma visita por dia. Isso evita aumentar o número toda vez que a página for atualizada.

### 3. Histórico das consultas

No admin, abra **Visitas e consultas** e confirme:

- Nome do usuário.
- E-mail do usuário.
- Tipo da consulta.
- CPF apenas com os números finais.
- Quantidade de resultados.
- Créditos cobrados.
- Data e hora.
- Indicação de consulta interna incluída na externa.

Teste também os filtros:

- Hoje.
- Últimos 7 dias.
- Últimos 30 dias.
- Consulta interna.
- Consulta externa.
- Busca por nome ou e-mail.

### 4. Consulta Interna separada

Com um usuário comum:

1. Abra **Consultar CPF**.
2. Escolha **Consulta Interna**.
3. Faça uma consulta.
4. Confirme que ela continua consumindo apenas 1 crédito.
5. Confirme que os resultados continuam funcionando normalmente.

### 5. Consulta Externa Completa combinada

Use um usuário de teste com pelo menos 3 créditos:

1. Abra **Consultar CPF**.
2. Escolha **Consulta Externa Completa**.
3. Informe um CPF válido.
4. Confirme a cobrança de 3 créditos.
5. Verifique se aparece o aviso:
   - fonte externa concluída;
   - base interna verificada.
6. Confirme que os dados externos aparecem com o título de fonte externa.
7. Confirme que os registros internos aparecem com o título **Base interna LocaCheck**.
8. Caso não exista ocorrência interna, confirme que aparece a mensagem de nenhum registro interno encontrado.
9. Confirme que foram descontados exatamente 3 créditos, e não 4.

### 6. Segurança e funções existentes

Confirme também:

- Cadastro continua funcionando.
- Login continua funcionando.
- Indicação continua funcionando.
- Compra de créditos abre normalmente.
- Pagamento PIX continua funcionando.
- Registro de ocorrência continua funcionando.
- Documentos das ocorrências aprovadas continuam abrindo.

## Quando publicar na produção

Somente depois de todos os testes acima passarem:

1. Abra o GitHub.
2. Crie um Pull Request da branch `novo-layout-mobile` para `main`.
3. Revise os arquivos alterados.
4. Faça o merge para `main`.
5. Aguarde o deploy da `main` na Vercel.
6. Abra o site oficial e repita os testes principais.

## Caso a alteração não apareça

Verifique nesta ordem:

1. Se o commit foi enviado para `novo-layout-mobile`.
2. Se a Vercel criou o Preview da branch correta.
3. Se o deploy terminou como **Ready**.
4. Se a migração V43 foi executada no Supabase.
5. Se você abriu o link de Preview correto.
6. Se existe rollback ativo na Vercel.
7. Depois do merge, se a `main` recebeu realmente o commit.
8. Faça um novo deploy sem cache apenas se for necessário.

## Validação técnica realizada

Foi executado o comando:

```bash
npm run build
```

Resultado: build de produção concluído com sucesso.

Existe apenas o aviso já esperado sobre o tamanho do arquivo JavaScript principal. Esse aviso não impediu o build e não foi necessário alterar dependências nesta versão.
