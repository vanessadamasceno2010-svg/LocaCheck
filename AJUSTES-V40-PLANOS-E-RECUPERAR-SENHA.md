# V40 — Planos e Recuperação de Senha

## Ajustes feitos

- Adicionado suporte visual ao plano de **150 créditos por R$ 97,50**.
- O plano de **100 créditos** continua sinalizado como **Melhor opção**.
- O plano **Ilimitado** volta a aparecer e recebe destaque em cor diferente.
- A tela de login/cadastro não informa mais para comprar créditos logo após cadastrar; informa apenas para confirmar o e-mail.
- A recuperação de senha agora usa redirecionamento seguro para o domínio atual.
- Erro `email rate limit exceeded` agora aparece em português.

## SQL

Rode o arquivo:

`MIGRACAO-V40-PLANO-150-E-ILIMITADO.sql`

Ele adiciona/atualiza o plano de 150 créditos e garante que o ilimitado fique ativo, caso exista no banco.

## Importante sobre recuperar senha

Se aparecer `email rate limit exceeded`, isso não é erro do código. É limite de envio de e-mail do Supabase. Para produção, configure SMTP próprio em:

`Supabase > Authentication > SMTP Settings`

Pode usar um serviço como Resend, Brevo, SendGrid ou outro SMTP. Depois disso, recuperação de senha e confirmação de e-mail ficam mais estáveis.
