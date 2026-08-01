# LocaCheck V59 — Correção do package-lock

## Problema identificado

Durante a resolução do merge, o arquivo `package-lock.json` publicado na branch `main` ficou com textos indevidos dentro do JSON, incluindo os nomes:

```text
novo-layout-mobile
main
```

Isso tornou o arquivo inválido e fez o comando `npm ci` parar antes de compilar o APK.

## Correção aplicada

- restauração integral do `package-lock.json` válido;
- confirmação de compatibilidade com o `package.json`;
- validação automática do JSON no GitHub Actions;
- manutenção do comando seguro e reproduzível `npm ci`;
- versão Android atualizada para 59;
- Artifact final atualizado para `LocaCheck-V59-APK-FINAL`.

## Banco de dados e serviços

- **SQL no Supabase:** não precisa.
- **Variáveis de ambiente:** nenhuma alteração.
- **PushinPay:** nenhuma alteração.
- **Créditos, pagamentos e permissões:** nenhuma alteração.

## Fluxo seguro

1. Substitua os arquivos primeiro na branch `novo-layout-mobile`.
2. Aguarde o GitHub Actions ficar verde.
3. Somente depois faça um novo merge para `main`.
4. Ao resolver conflitos, escolha o `package-lock.json` completo da V59. Não misture trechos das duas versões.
5. Aguarde o GitHub Actions da `main`.
6. Baixe `LocaCheck-V59-APK-FINAL`.
