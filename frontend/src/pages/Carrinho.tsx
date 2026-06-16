import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, MessageCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatMoney, createWhatsAppOrderMessage, whatsappUrl, LocalOrder, BRAND } from '../lib/api';

export function Carrinho() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useApp();
  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.preco_unitario || (item as any).preco || 0) * item.quantidade), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0);

  const handlePedidoRapido = () => {
    const order: LocalOrder = {
      numero: 'ORC-' + Date.now(),
      items: cart,
      cliente: {
        nome: 'Cliente',
        telefone: '',
        email: '',
        endereco: 'A combinar',
        observacoes: 'Pedido rápido pelo carrinho',
      },
      subtotal,
      frete: 0,
      desconto: 0,
      total: subtotal,
      created_at: new Date().toISOString(),
    };
    window.open(whatsappUrl(createWhatsAppOrderMessage(order)), '_blank');
  };

  if (cart.length === 0) {
    return (
      <div className="fade-in max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <MessageCircle size={40} className="text-gray-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-primary mb-3">Seu carrinho está vazio</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Explore nosso catálogo e encontre os melhores produtos personalizados para sua marca.
        </p>
        <Link to="/catalogo" className="btn btn-primary">
          Ver Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-6 pb-32 sm:pb-8">
      <h1 className="font-display text-3xl font-bold text-primary mb-6">
        Carrinho <span className="text-lg font-normal text-gray-500">({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4 mb-6 lg:mb-0">
          {cart.map((item) => {
            const itemTotal = (Number(item.preco_unitario || (item as any).preco || 0) * item.quantidade);
            const specsString = Object.entries(item.especificacoes_selecionadas)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ');

            return (
              <div key={`${item.id}-${JSON.stringify(item.especificacoes_selecionadas)}`} className="card p-4 flex gap-4">
                <img
                  src={item.imagem_principal}
                  alt={item.nome}
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-primary truncate">{item.nome}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{specsString}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.especificacoes_selecionadas, item.quantidade - 1)}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-primary w-6 text-center text-sm">{item.quantidade}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.especificacoes_selecionadas, item.quantidade + 1)}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-display font-bold text-primary">{formatMoney(itemTotal)}</span>
                      <button
                        onClick={() => removeFromCart(item.id, item.especificacoes_selecionadas)}
                        className="p-2 rounded-lg bg-red-50 text-danger hover:bg-red-100 active:scale-90 transition-all"
                        aria-label="Remover item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <button
            onClick={clearCart}
            className="w-full py-3 text-sm font-semibold text-danger hover:bg-red-50 rounded-xl transition-colors"
          >
            Limpar carrinho
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-display text-xl font-bold text-primary mb-5">Resumo do Pedido</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span className="font-semibold text-success">A combinar</span>
              </div>
              <div className="h-px bg-gray-200 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="font-display font-bold text-lg text-primary">Total</span>
                <span className="font-display font-bold text-2xl text-primary">{formatMoney(subtotal)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/checkout" className="btn btn-primary w-full text-base">
                Finalizar Pedido
                <ArrowRight size={18} />
              </Link>
              <button onClick={handlePedidoRapido} className="btn btn-whats w-full text-base">
                <MessageCircle size={18} />
                Pedido Rápido via WhatsApp
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              O pagamento não é feito pelo site. Seu pedido será enviado para o WhatsApp da gráfica para confirmação de prazo, entrega e forma de pagamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
