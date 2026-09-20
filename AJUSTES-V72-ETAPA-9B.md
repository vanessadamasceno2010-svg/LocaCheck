# LocaCheck V72 — Etapa 9B

## Ajustes realizados
- Corrigido salvamento de `logo_url` e `hero_image_url` no serviço do Meu Site. A logo enviada agora é persistida e exibida no site público e rodapé.
- Frota: primeiro campo renomeado para **Marca/Modelo**; Categoria e Ordem removidos da interface.
- Descrição inicial de nova moto: `Partida elétrica, injeção eletrônica, seguro, freio a disco, revisada.`
- Controles **Disponível para locação** e **Mostrar no site** refeitos para desktop/mobile.
- Botão **Editar** dos cards do painel reduzido.
- WhatsApp brasileiro agora exibe prefixo fixo **+55**; o usuário informa somente DDD + número. O valor salvo continua normalizado com 55.
- Prévia: removidos os textos redundantes “PRÉVIA EM TEMPO REAL” e “Veja o site enquanto edita” do cabeçalho interno. Botão mobile **Voltar ao editor** foi compactado e recebeu seta.
- Site público passou a usar os tons principal/secundário configurados pelo proprietário nas áreas antes azuis fixas.
- Cards públicos da frota ficaram mais compactos.
- Consulta pública da frota corrigida para carregar `model_year`, `engine_cc` e `deposit`; os cards agora mostram Ano, Cilindrada e Caução quando cadastrados.
- Categoria não é mais exibida no card público.

## Banco
Nenhuma migração nova na V72. A migração V71 continua necessária para bancos que ainda não possuem `model_year`, `engine_cc` e `deposit`.

## Validação
`npm run build` não pôde ser concluído neste ambiente porque o executável `vite` não está instalado/disponível (`vite: not found`). Rode `npm ci` e `npm run build` no ambiente local/Vercel.
