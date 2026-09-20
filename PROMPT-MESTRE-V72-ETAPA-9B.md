# PROMPT MESTRE — LOCACHECK V72 / ETAPA 9B

Continue o projeto LocaCheck a partir da V72. É uma aplicação React/Vite + Supabase para locadoras de motos. O recurso **Meu Site** permite que cada usuário elegível mantenha um site público multiempresa em `/site/{slug}`.

## Regras que não podem ser quebradas
- Um site por usuário; arquitetura multitenant, sem deploy/Supabase separado por locadora.
- Benefício ativo por compra elegível nos últimos 30 dias OU liberação administrativa ativa; banco/RPC/RLS é autoridade.
- Expiração não apaga dados.
- Site público só mostra site publicado, não suspenso e com benefício ativo.
- Não alterar pagamentos/PushinPay sem necessidade.
- Site público deve permanecer dinâmico por slug.

## Banco/migrações relevantes
- V62: `rental_sites`, `rental_site_motorcycles`, RPCs/RLS de benefício/publicação.
- V66: `rental_site_access_grants` e RPCs administrativas.
- V67: bucket/policies `rental-sites`.
- V68: correções de benefício/Storage.
- V71: adiciona à frota `model_year`, `engine_cc`, `deposit`. Se ainda não aplicada, executar `MIGRACAO-V71-FROTA-2-0.sql`.
- V72 NÃO exige nova migração.

## Arquivos principais
- `src/App.jsx`
- `src/App.css`
- `src/MyRentalSiteModal.jsx`
- `src/PublicRentalSitePage.jsx`
- `src/services/rentalSiteService.js`

## Estado V72
### Logo/imagens
Foi corrigido um bug em `updateMyRentalSite`: `logo_url` e `hero_image_url` agora pertencem à allowlist de campos atualizáveis. Antes o upload ocorria, mas a URL era descartada pelo serviço. O site público já consulta `logo_url` e agora a logo persistida aparece no header e footer.

### Frota
Interface de cadastro:
- Marca/Modelo (campo `name`)
- Ano (`model_year`)
- Cilindrada (`engine_cc`)
- Caução (`deposit`)
- Diária
- Semanal
- Mensal
- Descrição
- Disponível para locação
- Mostrar no site
- Foto

Categoria e Ordem foram removidos da interface. Os campos antigos podem continuar no banco por compatibilidade, mas não devem reaparecer na UI sem decisão explícita.

Descrição padrão de nova moto:
`Partida elétrica, injeção eletrônica, seguro, freio a disco, revisada.`

Os controles Disponível/Mostrar no site são responsivos. O botão Editar do card do painel é compacto.

### Site público / cards
`getPublicRentalSite()` agora inclui `model_year`, `engine_cc`, `deposit` na consulta pública de motos. Cards mostram Marca/Modelo, Ano, Cilindrada, Caução, descrição, preços disponíveis, disponibilidade e CTA inteligente de WhatsApp. Categoria não aparece. Cards foram compactados em desktop/mobile.

### CTA WhatsApp
O formulário mostra prefixo fixo `+55`. O usuário digita apenas DDD + número. Antes de persistir, o frontend normaliza para `55 + DDD + número`. Links públicos continuam protegidos contra duplicação de 55.

### Prévia mobile
Botão externo continua `Prévia em tempo real`. Ao abrir a prévia, o cabeçalho interno não repete “PRÉVIA EM TEMPO REAL” nem “Veja o site enquanto edita”. O botão `Voltar ao editor` é compacto, com seta, e adaptado ao mobile.

### Paleta pública
A página pública deve respeitar `primary_color` e `secondary_color`. Áreas que antes tinham azul fixo (seção de motoristas, badges, fundos suaves, bordas, CTA secundário, footer etc.) agora derivam da paleta com `color-mix`. Branco/cinzas neutros podem permanecer para contraste e legibilidade.

### Layout mobile do Meu Site
A V71 já tornou visíveis no mobile: Voltar, Compartilhar e Abrir site. Preservar isso.

## Validação
O ambiente de entrega não possui `vite` executável; `npm run build` retorna `vite: not found`. Antes de produção rodar:
`npm ci`
`npm run build`
Corrigir apenas erros reais encontrados sem desfazer regras acima.

## Próximo passo sugerido
Após validar V72 em desktop/mobile, evoluir para conteúdo gerenciável (Benefícios, Requisitos e FAQ) e refinamentos finais de SEO/compartilhamento. Ao terminar qualquer nova etapa, gerar novo Prompt Mestre autocontido.
