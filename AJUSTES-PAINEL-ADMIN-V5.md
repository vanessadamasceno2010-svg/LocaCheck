# Ajustes Painel Admin v5

Esta versão reforça a separação do painel administrativo por categorias e torna os dashboards de usuários e ocorrências visíveis dentro de seus próprios menus.

## O que mudou

- Criado menu administrativo separado por categoria:
  - Financeiro
  - Usuários
  - Ocorrências
  - Relatórios
  - Suporte
  - Auditoria
- Cada categoria agora abre uma área própria, evitando que tudo apareça misturado na mesma tela.
- Dashboard de Usuários fica dentro do menu Usuários.
- Dashboard de Ocorrências fica dentro do menu Ocorrências.
- Mantido o dashboard financeiro separado no menu Financeiro.
- Menu inferior em celular foi ajustado para admin: Financeiro, Usuários, Ocorrências e Mais.

## Observação importante

Se no deploy ainda aparecerem títulos antigos como "Usuários cadastrados" ou "Ocorrências cadastradas", significa que o arquivo `src/App.jsx` novo não foi enviado corretamente para a branch da Vercel, ou a Vercel fez deploy com cache antigo.

Para corrigir:
1. Confirmar se `src/App.jsx` no GitHub contém `adminCategoryMenu`.
2. Fazer redeploy sem cache na Vercel.
3. Confirmar se está usando a branch `novo-layout-mobile`.
