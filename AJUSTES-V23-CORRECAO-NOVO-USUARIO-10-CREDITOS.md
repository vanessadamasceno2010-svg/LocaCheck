# V23 - Correção definitiva novo usuário com 10 créditos

## Problema corrigido
Mesmo após a V22, novos usuários continuavam entrando com 20 créditos.

Isso indica que ainda existia algum trigger/função antiga criando o perfil com `credits = 20` antes do fluxo novo.

## O que foi feito
- Mantido default da coluna `profiles.credits` como 10.
- Recriada a proteção de perfil.
- Criado um trigger definitivo em `profiles` que força 10 créditos para qualquer novo usuário comum, mesmo quando o perfil é criado por trigger interno do Supabase/Auth.

## Como aplicar
1. Rodar `MIGRACAO-V23-CORRECAO-DEFINITIVA-NOVO-USUARIO-10-CREDITOS.sql` no Supabase.
2. Subir esta versão na branch de teste.
3. Cadastrar um e-mail novo.
4. Conferir em `profiles > credits` se entrou com 10.

## Observação
Essa migração não altera usuários antigos. Ela vale para novos cadastros.
