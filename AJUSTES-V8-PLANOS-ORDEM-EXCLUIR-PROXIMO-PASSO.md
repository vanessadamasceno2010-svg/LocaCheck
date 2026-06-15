# LocaCheck v8 — Planos em ordem de preço + excluir plano

## O que mudou

- Os planos agora aparecem do menor para o maior valor no painel admin.
- Os planos também aparecem do menor para o maior valor no modal Comprar Créditos.
- A tela Comprar Créditos seleciona automaticamente o plano mais barato.
- O admin agora tem botão **Excluir** em cada plano.
- O botão Excluir pede confirmação antes de remover.
- Se o Supabase bloquear exclusão por histórico de pagamentos, o sistema mostra erro e você pode apenas desativar o plano.

## Como subir

1. Rode o arquivo `MIGRACAO-V8-PLANOS-ORDEM-E-EXCLUSAO.sql` no Supabase.
2. Suba os arquivos na branch `novo-layout-mobile`.
3. Faça redeploy na Vercel sem cache, se necessário.
4. Teste:
   - Painel admin > Planos.
   - Conferir ordem do menor preço para o maior.
   - Excluir um plano de teste.
   - Abrir Comprar Créditos e conferir a mesma ordem.

## Próximo passo recomendado

Depois de validar essa versão, o próximo passo é proteger as imagens/comprovantes das ocorrências.

Não torne o bucket privado ainda sem ajustar o código, porque o app atual usa link público para exibir as imagens.
