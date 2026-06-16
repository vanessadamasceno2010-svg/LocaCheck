# LocaCheck V28 — Consulta Externa BigDataCorp

## O que foi adicionado

Esta versão adiciona a nova camada **Consulta Externa**, separada da consulta interna atual.

Agora a tela de consulta permite escolher:

- **Consulta Interna** — 1 crédito — busca apenas na base aprovada da LocaCheck.
- **Consulta Externa Básica** — 2 créditos — consulta `basic_data` na BigDataCorp.
- **Consulta Externa Completa** — 3 créditos — consulta `basic_data` + `lawsuits_distribution_data` na BigDataCorp.

## Segurança

As chaves da BigDataCorp não ficam no navegador. A consulta externa passa pela rota segura:

```text
/api/bigdata/external-consult
```

Essa rota valida o usuário logado, confere saldo, chama a BigDataCorp, salva log, salva cache, desconta créditos e retorna um resultado tratado.

## Cache

A consulta externa salva cache em:

```text
external_consultation_cache
```

Por padrão o cache dura 7 dias. Para alterar, configure na Vercel:

```text
BIGDATA_CACHE_DAYS=7
```

## Variáveis obrigatórias na Vercel

Adicione em **Vercel > Project > Settings > Environment Variables**:

```text
BIGDATA_TOKEN_ID=seu_token_id
BIGDATA_ACCESS_TOKEN=seu_access_token
BIGDATA_BASE_URL=https://plataforma.bigdatacorp.com.br
```

Opcionais:

```text
EXTERNAL_BASIC_CREDITS=2
EXTERNAL_COMPLETE_CREDITS=3
BIGDATA_CACHE_DAYS=7
BIGDATA_CACHE_HASH_SALT=uma_frase_secreta_qualquer
```

## Migração SQL

Rode no Supabase:

```text
MIGRACAO-V28-CONSULTA-EXTERNA-BIGDATACORP.sql
```

## Testes

1. Entre com usuário comum.
2. Faça uma Consulta Interna.
3. Faça uma Consulta Externa Básica com CPF válido.
4. Confira se descontou 2 créditos.
5. Faça uma Consulta Externa Completa com CPF válido.
6. Confira se descontou 3 créditos.
7. Repita a mesma consulta e veja se no admin aparece `cache_hit = true`.
8. Entre no admin > Consulta Externa.
9. Confira histórico, cache, créditos e status.

## Observação

Plano ilimitado não cobre consulta externa nesta versão, porque a BigDataCorp pode gerar custo real por chamada. A consulta externa sempre exige saldo de créditos.
