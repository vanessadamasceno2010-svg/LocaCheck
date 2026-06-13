import { Link } from 'react-router-dom';
import { Star, Clock } from 'lucide-react';
import { Product, formatMoney } from '../lib/api';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/produto/${product.slug}`} className="group card flex flex-col h-full active:scale-[0.98] transition-transform duration-200">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={product.imagem_principal}
          alt={product.nome}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {product.destaque && (
          <span className="absolute top-3 left-3 badge bg-gold text-primary shadow-lg">
            Destaque
          </span>
        )}
        {product.preco_original && product.preco_original > product.preco && (
          <span className="absolute top-3 right-3 badge bg-danger text-white shadow-lg">
            Oferta
          </span>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">
          {product.categoria_nome}
        </p>
        
        <h3 className="font-display font-bold text-primary text-lg leading-tight mb-2 line-clamp-2">
          {product.nome}
        </h3>
        
        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
          {product.descricao}
        </p>
        
        <div className="flex items-center gap-1.5 mb-3">
          <Star size={14} className="text-gold fill-current" />
          <span className="text-sm font-bold text-gray-700">
            {product.avaliacao_media.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">
            · {product.tempo_producao} dias úteis
          </span>
        </div>
        
        <div className="mt-auto pt-3 border-t border-gray-100">
          {product.preco_original && product.preco_original > product.preco && (
            <p className="text-sm text-gray-400 line-through mb-1">
              {formatMoney(product.preco_original)}
            </p>
          )}
          <p className="font-display font-bold text-2xl text-primary">
            {formatMoney(product.preco)}
          </p>
        </div>
      </div>
    </Link>
  );
}
