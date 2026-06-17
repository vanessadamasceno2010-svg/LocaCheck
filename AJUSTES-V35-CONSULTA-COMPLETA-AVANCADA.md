# V35 — Consulta Externa Completa/Avançada com mais dados

## Ajustes aplicados

- Removida a seção "Outras informações retornadas" do resultado.
- Consulta Externa Completa configurada para buscar dados pessoais e contatos.
- Consulta Externa Avançada configurada para buscar dados pessoais, contatos e processos judiciais nacionais.
- Resultado de contatos melhorado para listar todos os telefones, e-mails e endereços retornados e normalizados pela API.
- Telefones agora podem mostrar tipo, status, principal, recente, relação e prioridade quando a API retornar.
- E-mails agora podem mostrar tipo, status, principal, recente, relação e prioridade quando a API retornar.
- Endereços agora podem mostrar tipo, principal, recente e relação quando a API retornar.
- Pessoas relacionadas agora mostram nome, identificação fiscal, relacionamento, e-mail e telefones quando retornados.
- Processos continuam com linguagem simples, exibindo o campo de envolvimento da pessoa quando a API retornar `SpecificType` ou equivalente.
- `Zodiac Sign: LEAO` continua sendo exibido como `Signo: Leão`.

## Datasets padrão usados

### Consulta Externa Completa

Pode ser alterado pela variável de ambiente:

```env
BIGDATA_COMPLETE_DATASETS=basic_data,registration_data,addresses_extended.limit(20),phones_extended.limit(20),emails_extended.limit(20)
```

### Consulta Externa Avançada

Pode ser alterado pela variável de ambiente:

```env
BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,addresses_extended.limit(20),phones_extended.limit(20),emails_extended.limit(20),related_people_phones.limit(20),related_people_emails.limit(20),processes.limit(20)
```

## Observação importante

A plataforma visual da BigDataCorp mostra alguns datasets como "Relacionamentos Econômicos" e "Pessoas Relacionadas", mas a documentação pública nem sempre deixa claro o nome técnico exato de todos eles. Por isso, esta versão usa os nomes técnicos confirmados/encontrados na documentação pública e deixa as variáveis da Vercel preparadas para ajuste rápido.

Se algum dataset específico da sua conta tiver outro nome técnico, basta alterar `BIGDATA_COMPLETE_DATASETS` ou `BIGDATA_ADVANCED_DATASETS` na Vercel, sem mexer no código.

## SQL

Não precisa rodar SQL obrigatório nesta versão.

## Teste recomendado

1. Subir na branch `novo-layout-mobile`.
2. Fazer uma Consulta Externa Completa.
3. Conferir dados pessoais, telefones, e-mails e endereços.
4. Fazer uma Consulta Externa Avançada.
5. Conferir dados pessoais, contatos, pessoas relacionadas e processos.
6. Exportar consulta.
7. Conferir se a seção "Outras informações retornadas" não aparece mais.
