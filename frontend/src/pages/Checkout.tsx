import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatMoney, createWhatsAppOrderMessage, whatsappUrl, LocalOrder, BRAND } from '../lib/api';

export function Checkout() {
  const { cart, clearCart } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    cidade: '',
    estado: '',
    observacoes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.preco_unitario || (item as any).preco || 0) * item.quantidade), 0);
  const frete = 0;
  const total = subtotal + frete;

  if (cart.length === 0) {
    return (
      <div className="fade-in max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-primary mb-3">Carrinho vazio</h1>
        <p className="text-gray-500 mb-6">Adicione um produto ao carrinho antes de finalizar o pedido.</p>
        <button onClick={() => navigate('/catalogo')} className="btn btn-primary">Ver Catálogo</button>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const numero = 'WC' + Date.now();
    const endereco = `${formData.rua}, ${formData.numero}${formData.complemento ? `, ${formData.complemento}` : ''} - ${formData.cidade}/${formData.estado} - CEP ${formData.cep}`;

    const order: LocalOrder = {
      numero,
      items: cart,
      cliente: {
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        endereco,
        observacoes: formData.observacoes,
      },
      subtotal,
      frete,
      desconto: 0,
      total,
      created_at: new Date().toISOString()
    };

    localStorage.setItem('gp_last_order', JSON.stringify(order));
    
    const url = whatsappUrl(createWhatsAppOrderMessage(order));
    clearCart();
    
    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    window.open(url, '_blank');
    navigate(`/pedido-confirmado/${numero}`);
  };

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-6 pb-32 sm:pb-8">
      <button
        onClick={() => navigate('/carrinho')}
        className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar ao carrinho
      </button>

      <h1 className="font-display text-3xl font-bold text-primary mb-3">Finalizar Pedido</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        O pagamento <strong>não</strong> é feito pelo site. Seu pedido será enviado para o WhatsApp da gráfica ({BRAND.whatsapp}) para confirmação de prazo, entrega e forma de pagamento.
      </p>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              Dados Pessoais
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp *</label>
                <input
                  type="tel"
                  name="telefone"
                  required
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              Endereço de Entrega
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CEP *</label>
                <input
                  type="text"
                  name="cep"
                  required
                  value={formData.cep}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="00000-000"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rua *</label>
                <input
                  type="text"
                  name="rua"
                  required
                  value={formData.rua}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Nome da rua"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número *</label>
                <input
                  type="text"
                  name="numero"
                  required
                  value={formData.numero}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Complemento</label>
                <input
                  type="text"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Apto, Bloco, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                <input
                  type="text"
                  name="cidade"
                  required
                  value={formData.cidade}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Sua cidade"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <input
                  type="text"
                  name="estado"
                  required
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              Observações
            </h2>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              className="input min-h-[120px] resize-none"
              placeholder="Alguma observação sobre o pedido? (ex: cor preferida, data de entrega necessária, etc.)"
            />
          </div>
        </form>

        {/* Summary */}
        <div className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="card p-6 sticky top-24">
            <h2 className="font-display text-lg font-bold text-primary mb-5">Resumo</h2>
            
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto no-scrollbar">
              {cart.map((item) => (
                <div key={`${item.id}-${JSON.stringify(item.especificacoes_selecionadas)}`} className="flex gap-3 text-sm">
                  <span className="font-bold text-primary flex-shrink-0">{item.quantidade}x</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{item.nome}</p>
                    <p className="text-gray-500 text-xs">
                      {Object.values(item.especificacoes_selecionadas).join(' / ')}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-700 flex-shrink-0">
                    {formatMoney((Number(item.preco_unitario || (item as any).preco || 0) * item.quantidade))}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-200 my-4" />
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Frete</span>
                <span className="text-success">A combinar</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
                <span className="font-display font-bold text-lg text-primary">Total</span>
                <span className="font-display font-bold text-2xl text-primary">{formatMoney(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn btn-whats w-full text-base disabled:opacity-70"
            >
              {isSubmitting ? (
                'Enviando...'
              ) : (
                <>
                  <MessageCircle size={18} />
                  Enviar Pedido pelo WhatsApp
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              Ao clicar em enviar, você será redirecionado para o WhatsApp com os detalhes do pedido.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
