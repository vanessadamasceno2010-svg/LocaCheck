# Login com Google — opcional para próxima etapa

O login com Google pode ser feito sem custo adicional usando o Supabase Auth, mas exige configuração manual.

## O que será necessário

1. Criar credenciais OAuth no Google Cloud.
2. Ativar Google Provider no Supabase.
3. Informar Client ID e Client Secret no Supabase.
4. Configurar URL de callback no Google.
5. Adicionar botão "Entrar com Google" no site.
6. Testar cadastro/login com Google.

## Por que não foi ativado agora?

Porque se o botão for adicionado sem configurar o Google Provider, o usuário pode clicar e receber erro. Para não prejudicar o login atual, a V24 focou apenas em validação de WhatsApp e e-mail.
