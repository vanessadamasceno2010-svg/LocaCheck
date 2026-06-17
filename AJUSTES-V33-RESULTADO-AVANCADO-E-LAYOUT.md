# LocaCheck V33 — Resultado avançado, exportação e layout mais limpo

## Principais ajustes

- Consulta Externa Básica removida da tela do usuário.
- Consulta Externa Completa passa a consumir 2 créditos.
- Consulta Externa Avançada passa a consumir 3 créditos.
- Valores continuam fáceis de alterar pelas variáveis da Vercel:
  - EXTERNAL_COMPLETE_CREDITS=2
  - EXTERNAL_ADVANCED_CREDITS=3
  - BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,processes.limit(10)

## Resultado de processos

- O resultado agora destaca o envolvimento da pessoa no processo em linguagem simples:
  - Réu, acusado ou parte acionada
  - Autor, requerente ou parte que entrou com a ação
  - Testemunha
  - Vítima
  - Advogado vinculado
  - Terceiro/interessado
  - Parte relacionada, quando a fonte retornar um papel diferente

## Resultado externo

- Mantém CPF completo consultado no resultado.
- Exibe contatos, e-mails, endereços e processos quando retornados pela API.
- Adiciona bloco “Outras informações retornadas” para mostrar campos adicionais retornados pela fonte externa de forma clara.
- Remove da tela do usuário qualquer linguagem técnica sobre reaproveitamento/cache.

## Exportação

- Adicionado botão “Exportar consulta”.
- A exportação baixa um arquivo `.txt` com resumo organizado da consulta.

## Layout do usuário

- Créditos disponíveis ficam discretos no topo da página.
- Consultas realizadas saíram da tela inicial.
- Botão “Consultar Locatário” ficou com mais destaque.
- “Minhas Ocorrências”, “Minhas Consultas”, “Consultas Externas”, “Meus Pagamentos”, “Suporte” e “Termos e Privacidade” foram movidos para o Perfil.
- Ocorrências aparecem de forma discreta na parte superior com sinalização visual.
- Em Comprar Créditos, o botão “Gerar PIX” fica acima dos planos.

## SQL

Esta versão não exige SQL obrigatório.

## Teste recomendado

1. Subir na branch novo-layout-mobile.
2. Testar Consulta Externa Completa: deve descontar 2 créditos.
3. Testar Consulta Externa Avançada: deve descontar 3 créditos.
4. Verificar se o botão Exportar consulta baixa o arquivo.
5. Verificar se o Perfil abre os atalhos movidos.
6. Verificar Comprar Créditos e botão Gerar PIX acima dos planos.
