# LocaCheck V49

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
- remoção do resumo de consulta combinada.

Leia primeiro:

```text
AJUSTES-V49-PARTES-ATUALIZACOES-E-RELACIONADOS.md
```

Migração obrigatória:

```text
MIGRACAO-V48-CACHE-PESSOAS-RELACIONADAS.sql
```

Use primeiro a branch `novo-layout-mobile`. Não envie diretamente para `main`.
