# Ajustes V24 — WhatsApp e validação de e-mail

## O que foi ajustado

Esta versão ajusta o cadastro e a tela Meus Dados para melhorar a qualidade dos dados dos usuários.

### Cadastro de usuário
- Campo WhatsApp agora usa máscara automática.
- Campo WhatsApp pede DDD + número.
- Bloqueia WhatsApp inválido.
- Bloqueia e-mail inválido antes de enviar para o Supabase.
- E-mail é normalizado para letras minúsculas.
- Senha continua exigindo pelo menos 6 caracteres.

### Meus Dados
- Campo WhatsApp também usa máscara automática.
- Ao salvar, o sistema valida o WhatsApp.
- Ao salvar, o sistema valida o e-mail.
- O WhatsApp é salvo no banco apenas com números, evitando bagunça com formatos diferentes.

## Sobre login com Google

Não foi ativado nesta versão para não quebrar o login atual.

O login com Google é possível sem custo adicional no Supabase, mas exige configurar o provedor Google no painel do Supabase e criar credenciais no Google Cloud. Por isso, o ajuste mais seguro e rápido nesta etapa foi implementar validação de e-mail e WhatsApp.

Se quiser, a próxima versão pode ser a V25 com botão "Entrar com Google".

## Precisa rodar SQL?

Não precisa rodar SQL nesta versão.

## Como testar

1. Suba o projeto na branch de teste `novo-layout-mobile`.
2. Abra a Vercel de preview.
3. Tente cadastrar com WhatsApp incompleto.
4. O sistema deve bloquear.
5. Tente cadastrar com e-mail inválido.
6. O sistema deve bloquear.
7. Cadastre com WhatsApp válido, por exemplo `(88) 99999-9999`.
8. Confira no Supabase em `profiles` se o WhatsApp foi salvo apenas com números.
9. Faça login normalmente.
10. Abra `Meus Dados` e teste alterar WhatsApp/e-mail.
