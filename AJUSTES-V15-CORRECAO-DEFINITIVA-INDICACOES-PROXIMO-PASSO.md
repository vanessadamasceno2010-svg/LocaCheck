# V15 - Correção definitiva das indicações

## O que foi corrigido

- Adicionada rota segura `/api/referrals/claim` usando `SUPABASE_SERVICE_ROLE_KEY`.
- O bônus agora é aplicado no servidor, logo após o cadastro.
- O sistema cria/garante o perfil do novo usuário antes de aplicar o bônus.
- O bônus continua tendo fallback no login, caso o cadastro precise de confirmação de e-mail.
- O usuário indicador recebe +2 créditos.
- A movimentação aparece em `credit_movements`.
- O log administrativo aparece em `activity_logs` com ação `referral_bonus_granted`.
- O bônus não duplica se o link for usado novamente pelo mesmo cadastro.
- A mensagem verde da tela de cadastro foi removida.

## Antes de subir

1. Rode o SQL `MIGRACAO-V15-CORRECAO-DEFINITIVA-INDICACOES.sql` no Supabase.
2. Confirme na Vercel que existe `SUPABASE_SERVICE_ROLE_KEY`.
3. Suba esta versão na branch de teste.

## Teste recomendado

1. Entre com o usuário A.
2. Copie o link de indicação.
3. Abra em aba anônima.
4. Cadastre o usuário B.
5. Volte ao usuário A e atualize o painel.
6. Veja se entrou +2 créditos.
7. Abra Indique e ganhe créditos.
8. Veja se a movimentação apareceu.
9. Entre no admin > Auditoria.
10. Confira `referral_bonus_granted`.

## Próximo passo

Depois de confirmar a indicação, avançar para auditoria final:

- proteger `activity_logs` contra inserção manual por usuário comum;
- limpar policies duplicadas do suporte;
- registrar edição/exclusão de planos;
- registrar ações críticas do painel admin;
- revisar limites anti-abuso para evitar criação massiva de contas falsas.
