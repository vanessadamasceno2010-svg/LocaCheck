# V39 — Login, suporte público e ajustes visuais

## Ajustes aplicados

- A tela de login agora informa apenas que o usuário precisa confirmar o e-mail para realizar consultas.
- Quando o usuário tentar consultar sem WhatsApp válido, o sistema abre a tela de Perfil automaticamente para completar os dados.
- Removido o efeito animado dos botões do painel do usuário para deixar a página mais leve no celular.
- Removido plano ilimitado da exibição pública e da tela Comprar Créditos.
- Plano de 100 créditos marcado como Melhor opção.
- Botão Perfil recebeu mais destaque no topo do painel do usuário.
- Adicionada opção Esqueci minha senha na tela de login.
- Adicionado botão Falar com suporte na tela inicial pública.
- Mensagens do suporte público entram no painel de Suporte do admin.

## SQL obrigatório

Rode o arquivo:

`MIGRACAO-V39-SUPORTE-PUBLICO.sql`

Ele adiciona campos opcionais para contato público e cria uma policy para permitir envio de mensagem sem login.

## Teste recomendado

1. Abrir a tela inicial sem login.
2. Clicar em Falar com suporte e enviar uma mensagem.
3. Entrar como admin e conferir se a mensagem aparece em Suporte.
4. Testar Esqueci minha senha com um e-mail válido.
5. Entrar com usuário sem WhatsApp e tentar consultar: deve abrir Perfil.
6. Abrir Comprar Créditos e conferir se o plano ilimitado não aparece.
7. Confirmar que o plano 100 créditos aparece como Melhor opção.
8. Conferir no celular se os botões ficaram mais leves, sem animação passando.
