# LocaCheck V60 — Segurança e contenção

## Objetivo

Esta versão fecha a falha usada em 31/07/2026 para alterar créditos diretamente pela API do Supabase.

Ela mantém as funções existentes do site, aplicativo, consultas, Supabase, PushinPay e painel administrativo.

## O que foi alterado no código

- O painel admin deixou de atualizar `credits` diretamente na tabela `profiles`.
- Adição e retirada de créditos agora usam a função segura `admin_adjust_user_credits_v60`.
- Ativação e cancelamento do ilimitado agora usam `admin_set_user_unlimited_v60`.
- As duas funções conferem novamente no banco se quem executou é administrador.
- Toda alteração administrativa de crédito passa a gerar movimentação e log de auditoria.
- A aba Auditoria passou a mostrar tentativas bloqueadas de alteração de campos sensíveis.

## O que foi alterado no Supabase

### Migração V60A

- Remove o acesso público à função `set_user_role_by_email`.
- Corrige a proteção de `role`, `credits`, `consultas`, ilimitado e bloqueio.
- Cria `security_events` para registrar tentativas bloqueadas.
- Cria as funções seguras usadas pelo novo painel.
- Mantém temporariamente o painel V59 funcionando durante os testes.

### Migração V60B

- Remove completamente do navegador a permissão de atualizar colunas sensíveis de `profiles`.
- Mantém para usuários comuns apenas a edição de `nome`, `email` e `whatsapp`.
- Deve ser aplicada somente depois que o código V60 estiver publicado em produção.

## O que não foi alterado

- PushinPay.
- Chaves ou variáveis de ambiente.
- Login Supabase.
- Login Google.
- Banco de consultas e cache.
- Créditos atuais dos usuários.
- Pagamentos já registrados.
- Bucket público `records`.
- Funções de consulta por CPF, telefone ou e-mail.

## Ordem segura de implantação

### Etapa 1 — Preservar evidências

Guarde em local seguro:

- `supabase_logs(2).csv`;
- resultados SQL da investigação;
- ID `b22081b1-af6c-4779-94a7-4d848a4a2652`;
- IP `177.0.208.58`;
- horários em UTC.

Não exclua a conta investigada. Mantenha bloqueada no painel e banida no Supabase Auth.

### Etapa 2 — Executar V60A

No Supabase:

1. Abra `SQL Editor`.
2. Clique em `New query`.
3. Abra o arquivo `MIGRACAO-V60A-CONTENCAO-E-FUNCOES-SEGURAS.sql`.
4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em `Run`.
7. Confirme que o resultado final mostra `false` e `false`.

### Etapa 3 — Publicar somente na branch de teste

Use a branch:

`novo-layout-mobile`

Não envie primeiro para `main`.

### Etapa 4 — Testar o preview da Vercel

Teste:

1. Login de usuário comum.
2. Edição de nome e WhatsApp.
3. Consulta por CPF, telefone e e-mail.
4. Desconto correto de créditos.
5. Login do administrador.
6. Botão `+10 créditos`.
7. Botão `-10 créditos`.
8. Ativar ilimitado por 30 dias.
9. Cancelar ilimitado.
10. Promover e remover administrador usando uma conta de teste.
11. Bloquear e liberar uma conta de teste.
12. Abrir `Auditoria` e confirmar que os logs aparecem.

### Etapa 5 — Publicar o código V60

Somente depois dos testes:

1. Faça o merge de `novo-layout-mobile` para `main`.
2. Aguarde o deploy da Vercel.
3. Confirme que o deploy de produção corresponde ao commit da V60.
4. Teste novamente os botões administrativos.

### Etapa 6 — Executar V60B

Com o código V60 já em produção:

1. Volte ao `SQL Editor` do Supabase.
2. Abra `MIGRACAO-V60B-BLOQUEIO-DIRETO-DE-CREDITOS.sql`.
3. Copie todo o conteúdo.
4. Cole em uma nova consulta.
5. Clique em `Run`.
6. Teste novamente edição de perfil, créditos e ilimitado.

## Como testar a proteção

Depois da V60B, uma tentativa comum de atualizar `credits` diretamente pela API deve receber erro de permissão e o saldo não pode mudar.

O administrador deve continuar conseguindo alterar créditos pelos botões do painel porque os botões agora usam funções seguras.

## Variáveis de ambiente

Nenhuma variável precisa ser criada, removida ou alterada nesta versão.

## Observação sobre bloqueio por IP

O IP pode mudar ou ser compartilhado por uma rede móvel. Por isso, o principal bloqueio está no banco: mesmo que a pessoa use outro IP, outra conta, navegador ou ferramenta de API, não poderá alterar créditos ou permissões diretamente.

