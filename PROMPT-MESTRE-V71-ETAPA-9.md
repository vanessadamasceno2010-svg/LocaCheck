# PROMPT MESTRE — LOCACHECK V71 / ETAPA 9

Continue o projeto LocaCheck a partir da V71. Não recomece a arquitetura e preserve todas as regras existentes de autenticação, pagamentos, créditos, RLS, Storage, admin e Meu Site.

## Produto
LocaCheck é uma plataforma React/Vite + Supabase para locadoras de motos. O benefício `Meu Site` permite que cada usuário elegível tenha um site público multiempresa identificado por `slug`. URL temporária: `https://loca-check.vercel.app/site/{slug}`. Um site por usuário.

## Regra comercial
Meu Site fica ativo se houver compra elegível de créditos nos últimos 30 dias OU liberação administrativa ativa. Expiração bloqueia edição/publicação e tira o site público do ar sem apagar dados. Admin grant é independente de créditos e não adiciona saldo. A autoridade continua no banco/RPC/RLS, nunca apenas no frontend.

## Banco e migrações já existentes
- V62: `rental_sites`, `rental_site_motorcycles`, RPCs/RLS de benefício/publicação.
- V66: `rental_site_access_grants` + RPCs admin para conceder/revogar acesso.
- V67: Storage `rental-sites` e policies.
- V68: correção de benefício/Storage com UUID e helper seguro.
- V71: `MIGRACAO-V71-FROTA-2-0.sql` adiciona `model_year`, `engine_cc`, `deposit` em `rental_site_motorcycles`. Esta migração precisa ser executada no Supabase antes de usar os novos campos.

## Aplicação ativa
`index.html -> src/main.jsx -> src/App.jsx`.
Arquivos centrais do Meu Site:
- `src/MyRentalSiteModal.jsx`
- `src/PublicRentalSitePage.jsx`
- `src/services/rentalSiteService.js`
- `src/App.css`

## Estado do editor Meu Site
Editor em tela cheia, preview em tempo real, tabs Identidade / Página inicial / Descrição e sobre / Frota / Contato / Aparência. Usuário inativo não recebe campos de edição. Desktop mantém ações no cabeçalho. No mobile V71 existe barra dedicada e sempre visível com:
- Voltar — fecha Meu Site e retorna ao dashboard;
- Compartilhar — usa Web Share API quando disponível;
- Abrir site — abre a URL pública em nova aba quando publicado.
O botão de prévia mobile permanece compacto e abre overlay de preview com `Voltar ao editor`.

## Site público V71
Redesign responsivo e mais moderno/profissional. Hero mais limpo e sem o antigo card lateral de reserva. Layout otimizado para mobile, tablet e desktop. Mantém seções: hero, motoristas de aplicativo/benefícios, frota, requisitos, sobre, FAQ, contato e footer. Cores/logo/hero continuam dinâmicos por locadora.

## Frota 2.0
Cada moto possui:
- foto;
- modelo (`name`);
- categoria;
- ano (`model_year`);
- cilindrada (`engine_cc`);
- diária;
- semanal;
- mensal;
- caução (`deposit`);
- descrição;
- disponibilidade;
- publicada/rascunho;
- ordem.
Preço vazio/zero não deve aparecer no site público. Ano/cilindrada/caução só aparecem quando informados.

## CTA inteligente
Cada card de moto tem `Tenho interesse`. O link usa o WhatsApp da locadora e cria mensagem dinâmica equivalente a:
`Olá! Vi a Honda CG 160 no site da Top Motos e gostaria de saber mais sobre a locação. Poderia me passar mais informações?`
Nunca hardcode o nome Top Motos: usar `site.brand_name` e `moto.name`.

## Conteúdo V70 preservado
Mantém destaque `Aluguel de Motos para Motoristas de Aplicativo`, benefícios, requisitos e FAQ. FAQ usa `site.brand_name` em vez de TOPMOTOS fixo. Em etapa futura esses textos poderão virar conteúdo totalmente gerenciável.

## Regras de continuidade
- Não criar Supabase ou deploy separado por locadora.
- Não criar login separado para Meu Site.
- Não expor dados privados/CPF/pagamentos no site público.
- Não alterar PushinPay sem necessidade.
- Não apagar site/frota quando benefício expirar.
- Preservar slug e arquitetura multitenant.
- Preservar upload seguro via Storage/RLS.
- Não mostrar preço que não foi oferecido.
- Toda nova etapa deve gerar novo `PROMPT-MESTRE` autocontido.

## Validação V71
O build completo NÃO foi confirmado no ambiente de geração porque `vite` não estava instalado/executável no `node_modules` do ZIP. Ao receber o projeto, executar:
`npm ci`
`npm run build`
Corrigir apenas erros reais sem desfazer as regras acima.

## Próxima etapa recomendada — V72 / Etapa 10
Transformar Benefícios, Requisitos e FAQ em conteúdo gerenciável no editor, com ativar/desativar, adicionar/remover, ordenação e preview imediato; depois SEO/metadata e domínio próprio quando adquirido.
