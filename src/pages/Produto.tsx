import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Clock, ChevronLeft, ChevronRight, ShoppingCart, Zap } from 'lucide-react';
import { mockProducts, formatMoney } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import { BottomSheet } from '../components/BottomSheet';

export function Produto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useApp();
  
  const product = mockProducts.find((p) => p.slug === slug) || mockProducts[0];
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.entries(product.especificacoes || {}).forEach(([key, values]) => {
      initial[key] = values[0];
    });
    return initial;
  });
  
  const [imageIndex, setImageIndex] = useState(0);
  const [showCartSheet, setShowCartSheet] = useState(false);

  const allImages = [product.imagem_principal, ...(product.imagens_adicionais || [])];
  const totalPrice = product.preco * quantity;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSpecs);
    setShowCartSheet(false);
    navigate('/carrinho');
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedSpecs);
    navigate('/checkout');
  };

  const nextImage = () => setImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

  return (
    <div className="fade-in max-w-5xl mx-auto pb-24 sm:pb-8">
      {/* Mobile Image Gallery */}
      <div className="relative bg-gray-100 sm:hidden">
        <div className="aspect-square relative overflow-hidden">
          <img
            src={allImages[imageIndex]}
            alt={product.nome}
            className="w-full h-full object-cover"
          />
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronRight size={20} className="text-primary" />
              </button>
            </>
          )}
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
          {allImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === imageIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        <Link
          to="/catalogo"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg"
        >
          <ChevronLeft size={20} className="text-primary" />
        </Link>
      </div>

      <div className="px-4 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-10 sm:mt-8">
        {/* Desktop Image Gallery */}
        <div className="hidden sm:block">
          <div className="aspect-square rounded-3xl overflow-hidden bg-gray-100 mb-4">
            <img src={allImages[imageIndex]} alt={product.nome} className="w-full h-full object-cover" />
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    idx === imageIndex ? 'border-gold' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="sm:py-4">
          <Link to="/catalogo" className="sm:hidden inline-flex items-center gap-1 text-sm text-gray-500 mb-4">
            <ChevronLeft size={16} /> Voltar ao catálogo
          </Link>

          <span className="inline-block px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider mb-3">
            {product.categoria_nome}
          </span>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4">
            {product.nome}
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-gold fill-current" />
              <span className="font-bold text-primary">{product.avaliacao_media.toFixed(1)}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Clock size={16} />
              {product.tempo_producao} dias úteis para produção
            </div>
          </div>

          <div className="mb-6">
            {product.preco_original && product.preco_original > product.preco && (
              <span className="text-lg text-gray-400 line-through mr-3">
                {formatMoney(product.preco_original)}
              </span>
            )}
            <span className="font-display text-4xl font-bold text-primary">
              {formatMoney(product.preco)}
            </span>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">
            {product.descricao}
          </p>

          {/* Specifications */}
          <div className="space-y-4 mb-8">
            {Object.entries(product.especificacoes || {}).map(([key, values]) => (
              <div key={key}>
                <label className="block text-sm font-bold text-gray-700 mb-2">{key}</label>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedSpecs((prev) => ({ ...prev, [key]: value }))}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedSpecs[key] === value
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quantity */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-primary font-bold text-xl active:bg-gray-200 transition-colors"
              >
                -
              </button>
              <span className="font-display text-2xl font-bold text-primary w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-primary font-bold text-xl active:bg-gray-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex gap-4">
            <button
              onClick={() => {
                addToCart(product, quantity, selectedSpecs);
                setShowCartSheet(true);
              }}
              className="btn btn-outline flex-1 text-base"
            >
              <ShoppingCart size={20} />
              Adicionar ao Carrinho
            </button>
            <button onClick={handleBuyNow} className="btn btn-primary flex-1 text-base">
              <Zap size={20} />
              Comprar Agora
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 sm:px-0 sm:mt-12">
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-primary mb-4">Descrição Completa</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {product.descricao_completa}
          </p>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-display text-2xl font-bold text-primary">{formatMoney(totalPrice)}</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary font-bold shadow-sm"
            >
              -
            </button>
            <span className="font-bold text-primary w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary font-bold shadow-sm"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              addToCart(product, quantity, selectedSpecs);
              setShowCartSheet(true);
            }}
            className="btn btn-outline flex-1"
          >
            <ShoppingCart size={18} />
          </button>
          <button onClick={handleBuyNow} className="btn btn-primary flex-[2]">
            <Zap size={18} />
            Comprar Agora
          </button>
        </div>
      </div>

      {/* Cart Added Bottom Sheet */}
      <BottomSheet isOpen={showCartSheet} onClose={() => setShowCartSheet(false)} title="Adicionado ao Carrinho!">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-success" />
          </div>
          <p className="text-gray-600 mb-6">
            <span className="font-bold text-primary">{product.nome}</span> foi adicionado ao seu carrinho.
          </p>
          <div className="space-y-3">
            <Link to="/carrinho" className="btn btn-primary w-full" onClick={() => setShowCartSheet(false)}>
              Ver Carrinho
            </Link>
            <button onClick={() => setShowCartSheet(false)} className="btn btn-outline w-full">
              Continuar Comprando
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
