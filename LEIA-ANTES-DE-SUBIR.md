# LocaCheck - pacote visual Premium Mobile-First

Este pacote aplica o novo visual inspirado no layout enviado em HTML: fundo escuro premium, cards, botões interativos, modais em formato de bottom sheet e navegação inferior para celular.

## O que foi alterado

1. `index.html`
   - Corrigido para carregar o aplicativo real em `src/main.jsx`.
   - O arquivo enviado no ZIP estava com uma página antiga de outro projeto, “Gráfica W Criações”. Se esse arquivo antigo fosse enviado para produção, poderia quebrar ou trocar a tela do LocaCheck.

2. `src/App.jsx`
   - Ajustado texto principal da landing page.
   - Adicionada navegação inferior no painel logado para celular.
   - Adicionadas classes específicas nos botões principais para o novo visual.

3. `src/App.css`
   - Adicionado visual premium mobile-first.
   - Melhorado layout no celular.
   - Modais agora ficam parecidos com os prints enviados.
   - Botões receberam estilo mais dinâmico e aparência de app.

## O que NÃO foi alterado

- Supabase
- PushinPay
- Banco de dados
- APIs em `/api/pushinpay`
- Fluxo de pagamento
- Regras de login
- Tabelas do banco
- Chaves e variáveis de ambiente

## Como subir com segurança

Nunca suba direto na branch principal antes de testar.

1. Entre no GitHub do projeto.
2. Crie uma branch nova chamada: `novo-layout-mobile`.
3. Envie os arquivos deste pacote para essa branch.
4. Aguarde a Vercel criar o link de prévia.
5. Teste no link de prévia antes de publicar no site oficial.

## Checklist de teste na Vercel Preview

Teste no celular e no computador:

- Abrir a página inicial.
- Clicar em Entrar.
- Fazer login.
- Conferir painel do usuário.
- Clicar em Consultar Locatário.
- Clicar em Registrar Ocorrência.
- Clicar em Comprar Créditos.
- Conferir se PushinPay abre/gera PIX.
- Conferir histórico de pagamentos.
- Conferir painel admin.
- Aprovar/reprovar ocorrência.
- Exportar CSV.
- Enviar mensagem de suporte.

Só publique no site oficial depois que esses testes passarem.


## V16 - Indicações

Antes de subir a V16, rode no Supabase o arquivo:

`MIGRACAO-V16-CORRECAO-INDICACOES-AUTH-TRIGGER.sql`

Ele corrige o bônus de indicação usando trigger no Supabase Auth e reprocessa cadastros antigos feitos pelo link.
