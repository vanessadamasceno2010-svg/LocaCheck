# V38 — Segurança e controle de uso

## Objetivo

Esta versão protege o custo da plataforma e reduz abuso de cadastros.

## O que foi ajustado

- Bloqueia consultas quando o e-mail ainda não foi confirmado.
- Bloqueia consultas quando o perfil não tem WhatsApp válido.
- Cria status de conta: ativo, pendente e bloqueado.
- Admin pode bloquear e liberar usuários no painel.
- A consulta externa também valida a segurança no servidor da Vercel, não só na tela.
- Novo usuário continua nascendo com 0 créditos.
- Bloqueios ficam registrados na auditoria.

## SQL obrigatório

Rode no Supabase:

`MIGRACAO-V38-SEGURANCA-E-CONTROLE-DE-USO.sql`

## Configuração recomendada no Supabase

Ative confirmação de e-mail:

Authentication > Providers > Email > Confirm email

Também recomendo manter login Google, pois o e-mail Google já chega confirmado.

## Testes

1. Criar usuário novo por e-mail.
2. Antes de confirmar e-mail, tentar consultar.
3. Deve aparecer aviso pedindo confirmação do e-mail.
4. Confirmar e-mail.
5. Tirar WhatsApp do perfil e tentar consultar.
6. Deve pedir WhatsApp válido.
7. Como admin, bloquear o usuário.
8. Usuário bloqueado não deve conseguir consulta interna nem externa.
9. Liberar usuário pelo admin.
10. Usuário liberado volta a consultar se tiver créditos.
