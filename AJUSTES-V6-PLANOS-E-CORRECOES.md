# Ajustes v6 - LocaCheck

Esta versão adiciona e corrige:

1. Painel admin separado por categorias:
   - Financeiro
   - Planos
   - Usuários
   - Ocorrências
   - Relatórios
   - Suporte
   - Auditoria

2. Nova opção **Gerenciar Planos** no painel administrador:
   - Editar nome do plano
   - Editar preço em R$
   - Editar quantidade de créditos
   - Editar duração em dias
   - Marcar como ilimitado
   - Ativar/desativar para aparecer na tela de compra
   - Criar novo plano inativo para edição

3. Correções visuais com base nos prints:
   - Seção "Para quem é" agora fica organizada em cards reais
   - Seção "Como funciona" agora usa cards escuros, legíveis e premium
   - Modal "Comprar Créditos" corrigido para mostrar nome e preço dos planos no tema escuro
   - Menu mobile admin com botão Planos

## Atenção

Para a tela "Gerenciar Planos" funcionar, a tabela `plans` precisa permitir leitura e escrita para usuários admin nas regras RLS do Supabase.

Campos usados:

- id
- name
- credits
- price_cents
- is_unlimited
- duration_days
- active
- created_at

Suba primeiro na branch `novo-layout-mobile` e teste no preview da Vercel antes de enviar para a branch principal.
