# V27 - Gerenciar admin por e-mail e pelo painel

## O que foi adicionado

- Coluna `email` em `profiles`.
- Função `admin_set_user_role` para o painel admin transformar usuário comum em admin ou admin em usuário comum.
- Função `set_user_role_by_email` para alterar admin facilmente pelo SQL Editor usando apenas o e-mail.
- Botão `Tornar admin` no painel admin > Usuários.
- Botão `Tornar usuário comum` para remover acesso admin.
- Bloqueio para não remover o próprio admin pelo painel.
- Log automático em `activity_logs`.

## Como alterar admin direto pelo Supabase

Para transformar alguém em admin:

```sql
select public.set_user_role_by_email('email@exemplo.com', 'admin');
```

Para remover admin:

```sql
select public.set_user_role_by_email('email@exemplo.com', 'user');
```

## Como testar no painel

1. Entre como admin.
2. Vá em Usuários.
3. Escolha um usuário comum.
4. Clique em `Tornar admin`.
5. Saia e entre com esse usuário.
6. Verifique se abriu o painel admin.
7. Volte no admin principal e teste `Tornar usuário comum` em um usuário que não seja você.

