# LocaCheck V51

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
- remoção do resumo de consulta combinada.

Leia primeiro:

```text
AJUSTES-V51-DASHBOARD-ADMIN-E-MENU-CASCATA.md
```

Migração obrigatória:

```text
MIGRACAO-V48-CACHE-PESSOAS-RELACIONADAS.sql
```

Migração nova da V51:

```text
MIGRACAO-V51-RESUMO-DIARIO-ADMIN.sql
```

Use primeiro a branch `novo-layout-mobile`. Não envie diretamente para `main`.
