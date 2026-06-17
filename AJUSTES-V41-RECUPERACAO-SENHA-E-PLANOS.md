# V41 - Recuperação de Senha e Planos

## Ajustes realizados

- Corrigido fluxo de **Esqueci minha senha**.
- A recuperação de senha agora abre uma tela própria, pedindo apenas o e-mail.
- O campo senha não é mais exigido para enviar link de recuperação.
- Removido o plano ilimitado da tela pública e da tela de compra de créditos.
- Plano de **150 créditos por R$ 97,50** fica como destaque **Mais econômico**.
- Plano de 100 créditos não aparece mais como **Melhor opção**.
- Build testado com sucesso.

## SQL

Rode o arquivo:

`MIGRACAO-V41-PLANOS-SEM-ILIMITADO.sql`

Ele atualiza/cria o plano de 150 créditos e desativa planos ilimitados.

## Teste

1. Abrir o site sem login.
2. Clicar em Entrar.
3. Clicar em Esqueci minha senha.
4. Verificar se aparece somente o campo de e-mail.
5. Enviar recuperação.
6. Abrir planos e confirmar que o ilimitado sumiu.
7. Confirmar que 150 créditos aparece como Mais econômico.
8. Confirmar que 100 créditos não tem selo de Melhor opção.
