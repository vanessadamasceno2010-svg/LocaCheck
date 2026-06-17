# V42 — Relatório profissional de consulta

## Objetivo
Melhorar a exportação das consultas para gerar um relatório profissional da LocaCheck, com aparência de documento para salvar em PDF, imprimir ou enviar ao cliente/locador.

## Ajustes aplicados

- Botão de exportação agora abre um relatório profissional em nova janela.
- O navegador abre a opção de imprimir/salvar como PDF.
- Relatório com cabeçalho LocaCheck.
- Exibe data e hora da emissão.
- Exibe CPF consultado e nome encontrado.
- Resultado externo organizado por blocos:
  - Dados pessoais;
  - Contatos encontrados;
  - Endereços encontrados;
  - Pessoas relacionadas;
  - Resumo de processos;
  - Processos judiciais resumidos.
- Resultado interno também ganhou botão de exportar relatório.
- Linguagem simples nos processos, com o campo de envolvimento da pessoa destacado.
- Rodapé com aviso de responsabilidade e uso como apoio à decisão do locador.

## Como usar

1. Faça uma Consulta Interna ou Externa Completa.
2. Clique em **Exportar relatório** ou **Exportar consulta**.
3. Uma nova janela será aberta com o relatório.
4. Use o botão **Salvar/Imprimir PDF**.
5. No navegador, escolha **Salvar como PDF**.

## SQL

Esta versão não precisa de SQL obrigatório.

## Observação

A exportação usa a função de impressão do navegador. Isso evita adicionar bibliotecas pesadas no projeto e mantém o site mais leve no celular.
