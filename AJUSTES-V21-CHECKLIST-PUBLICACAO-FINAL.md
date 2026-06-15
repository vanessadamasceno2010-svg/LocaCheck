# LocaCheck v21 — Checklist de Publicação Oficial

Esta etapa não altera banco de dados e não exige SQL.

Objetivo: preparar a publicação da versão testada na branch principal sem comprometer o projeto em produção.

## Antes de publicar

1. Confirmar que a branch de teste está funcionando.
2. Testar login de usuário comum.
3. Testar login admin.
4. Testar cadastro novo.
5. Testar cadastro por link de indicação.
6. Testar bônus de indicação.
7. Testar geração de PIX.
8. Testar pagamento efetivado.
9. Testar liberação de créditos.
10. Testar consulta de locatário.
11. Testar cadastro de ocorrência.
12. Testar aprovação/reprovação no admin.
13. Testar planos no admin.
14. Testar suporte.
15. Testar auditoria.
16. Testar responsividade no celular.

## Backup recomendado

Antes de publicar oficialmente, confirme no Supabase:

- se o projeto possui backup recente;
- se as tabelas principais estão acessíveis;
- se pagamentos recentes estão salvos;
- se os usuários e créditos estão corretos.

Tabelas principais:

- profiles
- records
- payments
- plans
- consultation_logs
- support_messages
- activity_logs
- credit_movements
- pushinpay_webhook_logs

## Publicação oficial

Quando todos os testes estiverem ok:

1. Abra o GitHub.
2. Entre na branch de teste `novo-layout-mobile`.
3. Compare com a branch principal `main`.
4. Crie um Pull Request.
5. Revise os arquivos alterados.
6. Faça merge para a branch principal.
7. Aguarde a Vercel publicar o site oficial.

## Teste após publicar

Assim que a Vercel publicar o site oficial:

1. Abra o domínio oficial.
2. Teste login.
3. Teste dashboard usuário.
4. Teste painel admin.
5. Gere um PIX de teste.
6. Confirme se o financeiro carrega.
7. Teste indicação.
8. Teste consulta.
9. Teste cadastro de ocorrência.
10. Confirme se o site abre bem no celular.

## Monitoramento nas primeiras horas

Durante as primeiras horas após publicar, acompanhar:

- Vercel > Deployments
- Vercel > Functions Logs
- Supabase > Logs
- Supabase > Table Editor > payments
- Supabase > Table Editor > activity_logs
- Supabase > Table Editor > credit_movements
- Supabase > Authentication > Users

## O que não fazer após publicar

- Não apagar tabelas.
- Não trocar variáveis de ambiente.
- Não alterar a SERVICE_ROLE_KEY.
- Não rodar SQL aleatório.
- Não apagar policies sem revisão.
- Não subir arquivos direto na branch principal sem testar.

## Próxima etapa após publicar

Depois da publicação oficial, a próxima etapa é marketing e crescimento:

- texto de divulgação para WhatsApp;
- post de lançamento;
- campanha para locadoras;
- campanha de indicação;
- tutorial rápido para novos usuários;
- página de perguntas frequentes.
