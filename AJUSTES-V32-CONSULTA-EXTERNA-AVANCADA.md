# V32 - Consulta Externa Avançada

Esta versão adiciona uma nova opção na consulta externa:

- Consulta Externa Básica: 2 créditos
- Consulta Externa Completa: 3 créditos
- Consulta Externa Avançada: 5 créditos

## O que a Avançada busca

A consulta avançada usa datasets extras da BigDataCorp:

- `basic_data`
- `registration_data`
- `processes.limit(10)`

Ela tenta montar um resultado simples com:

- dados cadastrais;
- CPF completo consultado;
- nome da mãe, nome do pai e número social, se vierem no retorno;
- telefones;
- e-mails;
- endereços;
- resumo dos principais processos.

## Ajuste futuro fácil

Na Vercel, você pode ajustar sem mexer no código:

```env
EXTERNAL_ADVANCED_CREDITS=5
BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,processes.limit(10)
```

Se quiser aumentar o preço:

```env
EXTERNAL_ADVANCED_CREDITS=7
```

Se quiser trazer menos processos:

```env
BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,processes.limit(5)
```

Se quiser trazer mais processos:

```env
BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,processes.limit(20)
```

## Importante

O usuário não vê informação técnica de cache. A plataforma continua usando cache internamente para reduzir custo, mas a tela mostra apenas que a consulta foi realizada em fonte externa.

## SQL

Rode o arquivo:

`MIGRACAO-V32-CONSULTA-EXTERNA-AVANCADA.sql`

Ele é opcional, mas recomendado para melhorar filtros e histórico.
