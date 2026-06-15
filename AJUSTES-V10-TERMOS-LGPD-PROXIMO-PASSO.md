# Ajustes V10 — Termos, Privacidade e LGPD

## O que foi ajustado

- Termos de Uso e Política de Privacidade mais completos dentro do app.
- Aviso claro sobre finalidade da plataforma.
- Aviso sobre responsabilidade de quem cadastra ocorrência.
- Aviso sobre consulta, créditos e histórico de auditoria.
- Aviso sobre dados pessoais, CPF, documentos e comprovantes públicos.
- Inclusão de aceite obrigatório no cadastro.
- O aceite é salvo no metadata do usuário no Supabase Auth:
  - `terms_accepted`
  - `terms_version`
  - `terms_accepted_at`

## Não foi alterado

- PushinPay
- Supabase Client
- Webhook
- Regras dos pagamentos
- Bucket público de documentos
- Fluxo de consulta e ocorrência

## Como testar

1. Abra a tela inicial.
2. Clique em Cadastrar.
3. Tente cadastrar sem marcar o aceite dos termos.
4. O sistema deve impedir o cadastro.
5. Marque o aceite e cadastre normalmente.
6. No Supabase > Authentication > Users, abra o usuário e confira o metadata.

## Próximo passo recomendado

Proteger e organizar os logs administrativos:

- `activity_logs`: somente admin deve ler.
- usuário comum não deve inserir log manualmente.
- ações importantes devem ser registradas pelo app/admin.
- revisar suporte para remover policies duplicadas.
