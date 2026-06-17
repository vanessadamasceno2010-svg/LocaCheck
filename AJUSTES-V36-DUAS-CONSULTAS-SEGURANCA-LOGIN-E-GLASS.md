# V36 — Duas consultas, segurança de cadastro e visual glass premium

## O que foi ajustado

- A tela de consulta agora tem apenas duas opções:
  - **Consulta Interna** — 1 crédito.
  - **Consulta Externa Completa** — 3 créditos.
- A antiga opção separada de consulta externa completa foi removida.
- A consulta externa completa usa a estrutura avançada: dados pessoais, contatos, vínculos e processos judiciais nacionais.
- Removida a informação visual **“Consumo e origem / Fonte: BigDataCorp”** do resultado do usuário.
- Em pessoas relacionadas, o resultado prioriza:
  - nome completo;
  - CPF/CNPJ quando retornar;
  - grau de parentesco ou relacionamento;
  - telefone;
  - e-mail.
- Botão **Sair** ajustado para celular, fixo no canto superior direito.
- Botões do painel do usuário receberam visual premium com efeito glass, animação e novos ícones.
- Cards dos planos foram reduzidos mais para caber melhor no celular.
- Textos de cadastro deixaram de prometer créditos grátis.

## Segurança do cadastro

Esta versão remove a promessa visual de créditos grátis e altera o código para criar novos perfis com **0 créditos**.

Para garantir no banco de dados, rode a migração:

```text
MIGRACAO-V36-SEGURANCA-CADASTRO-SEM-CREDITOS-GRATIS.sql
```

Ela força novos usuários comuns a nascerem com 0 créditos, mesmo que exista trigger antigo que tentava dar 10 créditos.

## Configuração recomendada no Supabase

No Supabase, vá em:

```text
Authentication > Providers > Email
```

Ative:

```text
Confirm email
```

Assim, a pessoa precisa confirmar o e-mail antes de usar a conta.

Depois vá em:

```text
Authentication > Rate Limits
```

Se disponível no seu plano, reduza limites de envio de e-mail e cadastro para evitar abuso.

## Regra prática recomendada

Para evitar pessoas criando vários e-mails apenas para consultar gratuitamente:

- novo usuário começa com 0 créditos;
- consulta só acontece com crédito comprado ou liberado manualmente;
- Google login pode continuar ativo, mas também começa com 0 créditos;
- mantenha logs de auditoria ativos.

## Variáveis futuras

A consulta externa completa usa os datasets avançados. Você pode ajustar na Vercel:

```env
EXTERNAL_ADVANCED_CREDITS=3
BIGDATA_ADVANCED_DATASETS=basic_data,registration_data,addresses_extended.limit(20),phones_extended.limit(20),emails_extended.limit(20),related_people_phones.limit(20),related_people_emails.limit(20),processes.limit(20)
```

Para cobrar mais depois:

```env
EXTERNAL_ADVANCED_CREDITS=5
```

