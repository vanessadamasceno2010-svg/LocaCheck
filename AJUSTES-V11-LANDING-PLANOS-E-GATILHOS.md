# Ajustes V11 - Landing com planos dinâmicos e gatilhos de credibilidade

## O que foi alterado

- A tela inicial agora carrega os planos ativos direto da tabela `plans`.
- Todo plano novo criado e ativado no painel admin aparece automaticamente na página inicial.
- A seção de planos da landing segue a ordem do menor valor para o maior valor.
- Foram adicionados números de credibilidade na tela inicial:
  - consultas realizadas nos últimos 30 dias;
  - usuários cadastrados;
  - ocorrências aprovadas para consulta;
  - consultas realizadas hoje.
- Os números são agregados, sem expor dados pessoais.

## Antes de subir o código

Rode o arquivo:

`MIGRACAO-V11-LANDING-PLANOS-E-GATILHOS.sql`

em:

Supabase > SQL Editor > New query > Run

## Depois de subir

Teste:

1. Abra a tela inicial sem login.
2. Confira se os números aparecem.
3. Confira se os planos aparecem.
4. Entre como admin.
5. Crie um novo plano e deixe ativo.
6. Volte na tela inicial e confirme se ele aparece.
7. Desative o plano e confirme se ele some da tela inicial.

## Próximo passo recomendado

Após testar a v11, seguir para auditoria e logs administrativos:

- proteger `activity_logs`;
- impedir usuário comum de inserir log manual;
- organizar policies duplicadas de suporte;
- revisar logs de ações críticas do painel admin.
