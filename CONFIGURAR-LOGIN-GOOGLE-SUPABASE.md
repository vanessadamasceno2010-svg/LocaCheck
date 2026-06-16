# Como configurar login com Google no Supabase

Faça isso apenas depois de subir a V25.

## 1. No Supabase

Vá em:

Authentication > Providers > Google

Ative o provider Google.

## 2. No Google Cloud

Crie um projeto no Google Cloud e configure OAuth Client ID para Web Application.

No campo Authorized redirect URIs, adicione a URL que o Supabase mostra na tela do provider Google.
Normalmente ela parece com:

https://SEU-PROJETO.supabase.co/auth/v1/callback

Copie o Client ID e o Client Secret gerados pelo Google.

## 3. Volte no Supabase

Cole o Client ID e o Client Secret no provider Google e salve.

## 4. Teste

Abra o site, clique em Entrar com Google e selecione uma conta.

## Observação

Esse login não substitui o cadastro tradicional. Ele apenas adiciona uma opção mais rápida.
Usuários que entrarem com Google podem completar ou ajustar WhatsApp depois em Meus Dados.
