# Correção do erro ETIMEDOUT na Vercel

Se o deploy falhar tentando acessar `packages.applied-caas-gateway...`, faça:

1. Confirme que NÃO existe `package-lock.json` na raiz do projeto no GitHub.
2. Confirme que existe `.npmrc` na raiz do projeto com `registry=https://registry.npmjs.org/`.
3. Confirme que existe `vercel.json` na raiz do projeto.
4. Na Vercel, faça Redeploy SEM usar cache.
5. Se continuar, em Settings > Environment Variables, adicione:
   - NPM_CONFIG_REGISTRY = https://registry.npmjs.org/
   - VERCEL_FORCE_NO_BUILD_CACHE = 1
6. Faça novo deploy.

O problema não é Supabase nem PushinPay. É apenas instalação de dependências.
