# LocaCheck v13 - Programa de Indicação

## O que foi adicionado

- Link individual de indicação para cada usuário.
- Botão no painel do usuário: **Indique e ganhe créditos**.
- Compartilhamento rápido pelo WhatsApp.
- Cada cadastro criado através do link gera **2 créditos de bônus** para o usuário que indicou.
- Movimentações de bônus visíveis no painel do usuário.
- Registro automático no log administrativo (`activity_logs`) quando o bônus é concedido.

## Como funciona

1. Usuário copia o link no painel.
2. Novo usuário acessa o site por `?ref=CODIGO`.
3. O código fica salvo no navegador até o cadastro.
4. Ao criar o perfil, o banco identifica o indicador.
5. O banco adiciona 2 créditos ao indicador.
6. A movimentação aparece em `credit_movements`.
7. O log aparece em `activity_logs` para auditoria do admin.

## Antes de subir

Rode no Supabase o arquivo:

```text
MIGRACAO-V13-INDICACOES-CREDITOS.sql
```

Depois suba o projeto na branch de teste:

```text
novo-layout-mobile
```

## Checklist de teste

1. Entrar com um usuário antigo.
2. Abrir **Indique e ganhe créditos**.
3. Copiar o link.
4. Abrir o link em outro navegador ou aba anônima.
5. Criar uma nova conta.
6. Conferir se o usuário que indicou recebeu +2 créditos.
7. Conferir se aparece movimentação de bônus no painel do indicador.
8. Conferir se o log aparece em **Admin > Auditoria**.

## Próximo passo sugerido

Finalizar auditoria e proteção das ações administrativas:

- organizar policies de `activity_logs`;
- remover policies duplicadas de suporte;
- garantir que usuário comum não insira logs manualmente;
- registrar edições de planos, alterações de crédito e exclusões críticas.
