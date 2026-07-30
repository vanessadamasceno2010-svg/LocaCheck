# LocaCheck V59 — Correção final do APK

Versão com:

- consulta por CPF, telefone ou e-mail;
- limite de 1 resultado;
- cobrança somente após resultado válido;
- consulta de pessoa relacionada;
- idade atual, contatos simplificados e relacionamentos;
- consulta completa de processo por 1 crédito;
- pessoas relacionadas com nome, CPF, parentesco e consulta rápida;
- contatos com DDD e separação visual;
- identificação de pessoas relacionadas pelo contato retornado;
- recuperação do processo completo pelo dataset de pessoas;
- processo simplificado com partes e atualizações ordenadas;
- bloqueio de falso relacionamento com o próprio titular;
- CPF relacionado extraído do campo técnico retornado pela BigDataCorp;
- nome da pessoa relacionada resolvido pelo CPF identificado;
- agrupamento seguro de contatos repetidos da mesma pessoa;
- nome e tipo de participação lidos do mesmo objeto do processo;
- Dashboard administrativo diário como primeira área do painel;
- visitas, consultas, compras, faturamento e cadastros do dia;
- menu administrativo expansível com ícones e categorias organizadas;
- busca rápida de usuários por nome, e-mail ou WhatsApp no painel admin;
- aplicativo Android de teste com a mesma interface do site;
- ícone e tela de abertura próprios do LocaCheck;
- conexão Android somente por HTTPS;
- geração automática do APK pela branch de teste;
- abertura direta da tela de login no APK;
- exportação de consultas pelo recurso nativo de impressão/PDF do Android;
- tela de consulta em tamanho completo no celular;
- resultados e botões reorganizados para telas pequenas;
- botão de fechamento acessível no início e no final da consulta;
- correção da permissão do método Android `onDestroy()` para o APK compilar;
- APK final apontando somente para o domínio oficial do LocaCheck;
- geração automática do APK após o merge em `main`;
- correção do `package-lock.json` corrompido durante o merge;
- validação automática do arquivo antes da instalação das dependências;
- remoção do resumo de consulta combinada.

Leia primeiro:

```text
AJUSTES-V59-CORRECAO-PACKAGE-LOCK.md
```

Migração obrigatória:

```text
MIGRACAO-V48-CACHE-PESSOAS-RELACIONADAS.sql
```

Migração nova da V51:

```text
MIGRACAO-V51-RESUMO-DIARIO-ADMIN.sql
```

Não existe SQL novo na V59.

Use primeiro a branch `novo-layout-mobile`. Não envie diretamente para `main`.
