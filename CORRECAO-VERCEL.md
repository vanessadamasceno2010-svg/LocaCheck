# Correção do erro de Deploy na Vercel

O erro de build aconteceu porque o arquivo package-lock.json estava apontando para um registro interno de pacotes que a Vercel não consegue acessar.

Correção aplicada neste pacote:

1. Removido o arquivo package-lock.json.
2. Criado o arquivo .npmrc apontando para o registro público oficial do npm:

registry=https://registry.npmjs.org/

Depois de subir este pacote na branch novo-layout-mobile, clique em Redeploy na Vercel.
