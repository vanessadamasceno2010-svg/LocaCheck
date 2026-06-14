# LocaCheck V9 — Documentos públicos na consulta

## O que foi ajustado

- Mantém o bucket `records` como público.
- A tela de consulta mostra botão para abrir documento/comprovante quando a ocorrência aprovada tiver `imagem_url`.
- O cadastro/edição de ocorrência agora aceita imagem ou PDF.
- PDFs não são exibidos como imagem quebrada; aparece apenas o botão para abrir.
- Imagens continuam mostrando prévia normalmente.

## Antes de subir o código

Rode no Supabase o arquivo:

`MIGRACAO-V9-DOCUMENTOS-PUBLICOS-CONSULTA.sql`

Caminho:

`Supabase > SQL Editor > New query > colar conteúdo > Run`

## Testes

1. Entrar como usuário comum.
2. Consultar uma ocorrência aprovada que tenha documento/comprovante.
3. Confirmar se aparece o botão para abrir o documento.
4. Registrar uma ocorrência com imagem.
5. Registrar uma ocorrência com PDF.
6. Entrar como admin e aprovar.
7. Consultar novamente como usuário comum.

## Próximo passo recomendado

Ajustar Termos de Uso e Política de Privacidade para deixar claro que documentos/comprovantes de ocorrências aprovadas podem ser visualizados por usuários autenticados que realizarem consulta na plataforma.
