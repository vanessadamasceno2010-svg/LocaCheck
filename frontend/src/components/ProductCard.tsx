import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Product, formatMoney } from '../lib/api';

interface ProductCardProps {
  product: Product;
}

function activeVariations(product: Product) {
  return Array.isArray(product.variacoes)
    ? product.variacoes.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0)
    : [];
}

function minPrice(product: Product) {
  const vars = activeVariations(product);

  if (!vars.length) {
    return Number(product.preco || 0);
  }

  return Math.min(...vars.map((v) => Number(v.preco || 0)));
}

function safeProductPath(product: Product) {
  // Usa primeiro o ID, porque ele não tem acento, não muda e evita erro de slug/nome.
  // Isso corrige o problema de clicar no produto da home e cair em /produto/Cartao com tela branca.
  const raw = product.id || product.slug || product.nome || '';
  return encodeURIComponent(String(raw).trim());
}

export function ProductCard({ product }: ProductCardProps) {
  const vars = activeVariations(product);
  const price = minPrice(product);
  const target = safeProductPath(product);
  const image = product.imagem_principal || '/assets/chaveiros-personalizados.jpeg';

  return (
    <Link
      to={`/produto/${target}`}
      className="group card flex flex-col h-full active:scale-[0.98] transition-transform duration-200 cursor-pointer"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={image}
          alt={product.nome}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = '/assets/chaveiros-personalizados.jpeg';
          }}
        />

        {product.destaque && (
          <span className="absolute top-3 left-3 badge bg-gold text-primary shadow-lg">
            Destaque
          </span>
        )}

        {product.preco_original && product.preco_original > price && (
          <span className="absolute top-3 right-3 badge bg-danger text-white shadow-lg">
            Oferta
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">
          {product.categoria_nome || 'Produto'}
        </p>

        <h3 className="font-display font-bold text-primary text-lg leading-tight mb-2 line-clamp-2">
          {product.nome}
        </h3>

        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
          {product.descricao || 'Produto personalizado.'}
        </p>

        <div className="flex items-center gap-1.5 mb-3">
          <Star size={14} className="text-gold fill-current" />
          <span className="text-sm font-bold text-gray-700">
            {Number(product.avaliacao_media || 5).toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">
            · {product.tempo_producao || 3} dias úteis
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100">
          {product.preco_original && product.preco_original > price && (
            <p className="text-sm text-gray-400 line-through mb-1">
              {formatMoney(product.preco_original)}
            </p>
          )}

          {vars.length > 0 && (
            <p className="text-xs text-gray-500 font-semibold">A partir de</p>
          )}

          <p className="font-display font-bold text-2xl text-primary">
            {formatMoney(price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
