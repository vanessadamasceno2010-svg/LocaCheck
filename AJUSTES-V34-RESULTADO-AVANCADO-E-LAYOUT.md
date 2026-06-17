# V34 — Resultado Avançado, Avisos e Layout de Compra

## Ajustes realizados

- A sinalização de **Ocorrências** foi removida da tela inicial quando não existe ocorrência pendente do usuário.
- A sinalização só aparece quando houver ocorrência pendente cadastrada por aquele usuário.
- O botão **Notificações** só aparece na tela inicial quando existe notificação nova/não lida.
- Quando não houver notificação nova, o acesso fica dentro de **Perfil**.
- Cards dos planos foram reduzidos para caberem melhor na tela do celular.
- `Zodiac Sign: LEAO` passou a ser exibido como **Signo: Leão**.
- `SpecificType` dos processos passou a ser tratado como **Envolvimento da pessoa**.
- Telefones, e-mails e endereços retornados pela API passam a ser exibidos sem corte artificial de 4 ou 5 itens.
- Pessoas relacionadas e relacionamentos econômicos passam a ser exibidos quando a API retornar.
- Exibe nome, identificação fiscal e telefones das pessoas relacionadas quando disponíveis.
- Descrições das consultas atualizadas:
  - Consulta Interna: busca registro do locador em outras locadoras.
  - Consulta Completa: dados pessoais e contatos.
  - Consulta Avançada: dados pessoais + processos judiciais nacional.

## SQL

Não precisa rodar SQL obrigatório nesta versão.

## Teste recomendado

1. Subir na branch `novo-layout-mobile`.
2. Fazer login com usuário comum sem ocorrência pendente: a sinalização de Ocorrências não deve aparecer no topo.
3. Cadastrar uma ocorrência nova: a sinalização deve aparecer como pendente.
4. Marcar notificações como lidas: o botão Notificações deve sumir da tela inicial e continuar acessível em Perfil.
5. Fazer Consulta Externa Completa e Avançada.
6. Conferir contatos, endereços, pessoas relacionadas e processos.
7. Abrir Comprar Créditos e verificar cards compactos.
