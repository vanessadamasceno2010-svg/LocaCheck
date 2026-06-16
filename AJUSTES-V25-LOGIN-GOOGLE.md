# V25 - Login com Google

## O que foi adicionado

- Botão **Entrar com Google** na tela de login/cadastro.
- Fluxo OAuth do Supabase com provedor Google.
- Mantida a validação de e-mail, senha e WhatsApp no cadastro tradicional.
- Mantido o fluxo de indicação: se o usuário abrir um link de indicação antes do login com Google, o código fica salvo no navegador e pode ser aplicado quando o perfil carregar.

## Precisa rodar SQL?

Não. Esta versão não precisa de SQL.

## Atenção

O botão só funciona depois que o provedor Google estiver configurado no Supabase.
Se clicar antes de configurar, o Supabase pode retornar erro informando que o provider Google não está habilitado.
