# Gráfica W Criações - Versão Mobile Premium

Este é um projeto React + Vite + Tailwind CSS totalmente otimizado para dispositivos móveis, com uma interface moderna, premium e intuitiva.

## 🚀 Melhorias Implementadas para Mobile

1. **Navegação Inferior (Bottom Nav)**: Barra de navegação fixa na parte inferior para fácil acesso com o polegar (Início, Catálogo, Carrinho, Conta).
2. **Bottom Sheets**: Modais que deslizam de baixo para cima, padrão nativo de apps móveis, substituindo modais centrais desconfortáveis.
3. **Touch Targets Ampliados**: Botões e campos de formulário com altura mínima de 44-48px para facilitar o toque.
4. **Barra de Ação Fixa**: Na página de produto, o preço e os botões "Adicionar ao Carrinho" / "Comprar" ficam fixos na parte inferior da tela.
5. **Galeria de Imagens Swipeable**: Navegação por imagens do produto com indicadores de página e botões de seta grandes.
6. **Listas Responsivas no Admin**: Tabelas que se transformam em cards empilhados em telas pequenas para melhor legibilidade.
7. **Prevenção de Zoom no iOS**: Inputs configurados com `text-base` para evitar o zoom automático indesejado ao focar em campos no iPhone.
8. **Safe Areas**: Suporte a `env(safe-area-inset-*)` para dispositivos com notch ou barra de gestos.

## 📦 Instalação e Execução

1. Navegue até a pasta do projeto:
   ```bash
   cd /workspace/output
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra o navegador no endereço fornecido (geralmente `http://localhost:3000`).

## 🛠️ Tecnologias Utilizadas

- **React 18**: Biblioteca UI com Hooks e Context API para estado global.
- **Vite**: Build tool ultrarrápida.
- **Tailwind CSS**: Framework CSS utilitário para estilização consistente e responsiva.
- **React Router DOM**: Roteamento declarativo.
- **Lucide React**: Ícones modernos e leves.

## 📱 Estrutura de Arquivos

```
output/
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   └── api.ts          # Mock de dados e utilitários
    ├── contexts/
    │   └── AppContext.tsx  # Estado global (Carrinho, Usuário)
    ├── components/
    │   ├── Layout.tsx
    │   ├── Header.tsx
    │   ├── BottomNav.tsx
    │   ├── BottomSheet.tsx
    │   └── ProductCard.tsx
    └── pages/
        ├── Home.tsx
        ├── Catalogo.tsx
        ├── Produto.tsx
        ├── Carrinho.tsx
        ├── Checkout.tsx
        ├── Confirmacao.tsx
        ├── Acompanhar.tsx
        ├── Login.tsx
        ├── MinhaConta.tsx
        ├── Sobre.tsx
        ├── Contato.tsx
        └── admin/
            ├── AdminLayout.tsx
            ├── Dashboard.tsx
            ├── Produtos.tsx
            └── Pedidos.tsx
```
