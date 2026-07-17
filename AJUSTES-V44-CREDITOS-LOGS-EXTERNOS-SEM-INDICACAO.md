# LocaCheck V44 — créditos, consultas e indicação

## O que foi solicitado

1. Mostrar uma mensagem clara quando a consulta interna não encontrar ocorrência.
2. Remover o programa de indicação e seus botões.
3. Dar exatamente 5 créditos para cada novo usuário.
4. Corrigir o painel administrativo para registrar consultas externas.
5. Mostrar `Consulta Externa` como título do card administrativo.
6. Mostrar o CPF completo consultado no card administrativo da consulta externa.
7. Mostrar créditos consumidos e saldo restante após a consulta externa.
8. Remover a mensagem de que a consulta interna foi incluída sem cobrança adicional no card administrativo.

## O que foi alterado

### Consulta interna

Quando nenhum registro for encontrado, o usuário verá:

> A pessoa consultada não possui ocorrência registrada por outras locadoras em nosso banco de dados.

A mesma mensagem também aparece na verificação interna feita junto com a consulta externa.

### Indicação

- Removido o botão `Indique e ganhe créditos`.
- Removido o botão `Indicar` do menu inferior.
- Removido o painel de compartilhamento de indicação.
- Removida a leitura de código `?ref=` no cadastro.
- Removida a concessão de novos bônus.
- A rota antiga `/api/referrals/claim` responde que o programa foi desativado.
- O histórico antigo de bônus não é apagado.

### Novos usuários

- Cada novo perfil comum recebe exatamente **5 créditos**.
- Usuários que já existem não têm o saldo alterado.
- Administradores não têm o saldo forçado para 5.
- Nenhum trigger foi criado em `auth.users`.

### Consultas externas no admin

A falha era causada por uma restrição antiga do Supabase que aceitava somente os tipos `external_basic` e `external_complete`. A aplicação atual usa `external_advanced`, então o resultado era exibido ao usuário, mas o insert do histórico externo podia ser recusado.

A V44:

- permite `external_advanced` no log e no cache;
- adiciona `cpf_full` ao histórico externo;
- adiciona `credits_balance_after`;
- tenta novamente o registro em formato compatível caso exista uma estrutura antiga;
- recupera do `activity_logs` consultas antigas que não entraram na tabela externa;
- atualiza o resumo do painel administrativo.

## Privacidade e LGPD

O CPF completo da consulta externa fica em `external_consultation_logs`, com RLS ativo. Ele não é colocado na contagem pública de visitas.

O CPF completo aparece no painel apenas para administradores. O próprio usuário também pode acessar o histórico das consultas que ele mesmo realizou, conforme a regra já existente.

Consultas antigas podem continuar mostrando apenas os quatro últimos números, porque o CPF completo não havia sido armazenado naquela época. O saldo restante também pode aparecer como `Não registrado` em consultas antigas.

## Arquivos alterados

- `src/App.jsx`
- `src/App.css`
- `api/bigdata/external-consult.js`
- `api/referrals/claim.js`
- `README.md`

## Arquivos novos

- `MIGRACAO-V44-CREDITOS-LOGS-EXTERNOS-SEM-INDICACAO.sql`
- `AJUSTES-V44-CREDITOS-LOGS-EXTERNOS-SEM-INDICACAO.md`

## Precisa executar SQL?

**Sim.**

Arquivo:

```text
MIGRACAO-V44-CREDITOS-LOGS-EXTERNOS-SEM-INDICACAO.sql
```

Onde colar:

```text
Supabase → SQL Editor → New query → colar todo o arquivo → Run
```

A migração não apaga usuários, pagamentos, planos, ocorrências, documentos ou movimentações antigas.

## Ordem segura de instalação

### 1. Trabalhar somente na branch de teste

Use:

```text
novo-layout-mobile
```

Não envie diretamente para `main`.

### 2. Subir o código completo da V44

No GitHub Desktop:

1. Abra o repositório LocaCheck.
2. Selecione a branch `novo-layout-mobile`.
3. Faça uma cópia de segurança da pasta atual.
4. Extraia o ZIP da V44.
5. Copie o conteúdo da pasta `LocaCheck-V44` para a pasta local do repositório.
6. Confirme a substituição dos arquivos.
7. No GitHub Desktop, confira a lista de alterações.
8. Use o resumo do commit:

```text
V44 - 5 créditos, logs externos e remoção de indicação
```

9. Clique em `Commit to novo-layout-mobile`.
10. Clique em `Push origin`.

### 3. Abrir o Preview da Vercel

1. Entre na Vercel.
2. Abra o projeto LocaCheck.
3. Acesse `Deployments`.
4. Localize o deploy da branch `novo-layout-mobile`.
5. Abra o endereço de Preview.
6. Não promova para produção.

### 4. Executar o SQL

O Preview e a produção normalmente usam o mesmo Supabase. Por isso, primeiro confirme que o deploy da branch abriu corretamente.

Depois, execute a migração V44 no SQL Editor e faça todos os testes pelo endereço de Preview. A migração foi criada para continuar compatível com a V43 enquanto os testes são feitos, mas novos cadastros passarão a receber 5 créditos assim que o SQL for executado.

## Testes obrigatórios

### Teste 1 — consulta interna sem ocorrência

1. Entre com usuário de teste que tenha crédito.
2. Faça uma consulta interna por CPF sem registro aprovado.
3. Confirme a mensagem:

```text
A pessoa consultada não possui ocorrência registrada por outras locadoras em nosso banco de dados.
```

4. Confirme que foi consumido apenas 1 crédito.

### Teste 2 — consulta externa

1. Anote o saldo do usuário.
2. Faça uma Consulta Externa Completa.
3. Confirme que foram descontados 3 créditos.
4. Confirme que o resultado externo continua aparecendo.
5. Confirme que a base interna também foi verificada.

### Teste 3 — painel admin

1. Entre como administrador.
2. Abra `Visitas e consultas`.
3. Clique em `Atualizar atividade`.
4. Confirme que existe um card com o título `Consulta Externa`.
5. Confirme o CPF completo.
6. Confirme `Créditos consumidos: 3`.
7. Confirme o saldo após a consulta.
8. Confirme que a mensagem `Incluída: verificação interna...` não aparece.
9. Abra também `Consulta Externa` no menu do admin e confirme os mesmos dados.

### Teste 4 — novo usuário com 5 créditos

Use um e-mail que nunca foi cadastrado:

1. Faça um cadastro novo.
2. Confirme o e-mail.
3. Entre na conta.
4. Confirme saldo inicial de exatamente 5 créditos.
5. Verifique no admin que o usuário tem 5 créditos.

Não altere o saldo de usuários antigos para fazer esse teste.

### Teste 5 — indicação removida

1. Confirme que não existe `Indique e ganhe créditos` no painel.
2. Confirme que não existe `Indicar` no menu inferior.
3. Abra o site com `?ref=TESTE` e confirme que o cadastro funciona normalmente, sem aplicar bônus.

### Teste 6 — funções existentes

Confirme também:

- login por e-mail;
- login Google, caso esteja ativo;
- cadastro de ocorrência;
- aprovação de ocorrência;
- compra de créditos;
- PushinPay;
- histórico de pagamentos;
- suporte;
- permissões administrativas.

## Publicação

Somente depois de todos os testes:

1. Abra um Pull Request de `novo-layout-mobile` para `main`.
2. Revise os arquivos alterados.
3. Faça o merge.
4. Aguarde o deploy da `main` na Vercel.
5. Confirme se o deploy correto foi promovido para produção.
6. Abra o site em janela anônima e teste novamente.

Se a Vercel não atualizar, verifique branch, deploy promovido, rollback e cache antes de alterar qualquer código.

## Validação técnica realizada antes da entrega

- `npm run build`: concluído com sucesso.
- Verificação de sintaxe das rotas da consulta externa e indicação: concluída.
- Não foi adicionada ou alterada nenhuma variável de ambiente.
- PushinPay, pagamentos, planos, bucket `records` e autenticação Supabase não foram modificados.
- O comando `npm run lint` continua indisponível porque o projeto não possui o pacote `eslint` instalado nas dependências. Nenhuma dependência foi adicionada apenas para isso.
