import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Printer, ArrowRight, Clock } from 'lucide-react';
import { LocalOrder, formatMoney, BRAND } from '../lib/api';

export function Confirmacao() {
  const { numero } = useParams<{ numero: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LocalOrder | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gp_last_order');
    if (saved) {
      setOrder(JSON.parse(saved));
    } else {
      navigate('/catalogo');
    }
  }, [navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  return (
    <div className="fade-in max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="card p-6 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-success" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">
            Pedido Recebido!
          </h1>
          <p className="text-gray-600 mb-2">
            Número do pedido: <span className="font-bold text-primary">{order.numero}</span>
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            A confirmação do pagamento, produção e entrega será feita diretamente pelo WhatsApp com nossa equipe.
          </p>
        </div>

        {/* Receipt */}
        <div className="bg-gray-50 rounded-2xl p-5 sm:p-6 mb-6 print:bg-white print:shadow-none print:border print:border-gray-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-display font-bold text-2xl">W</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-primary">Recibo do Pedido</h2>
              <p className="text-sm text-gray-500">{BRAND.nome}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500 mb-1">Cliente</p>
              <p className="font-semibold text-gray-800">{order.cliente.nome}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Telefone</p>
              <p className="font-semibold text-gray-800">{order.cliente.telefone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-gray-500 mb-1">Endereço de Entrega</p>
              <p className="font-semibold text-gray-800">{order.cliente.endereco}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            {order.items.map((item) => (
              <div key={`${item.id}-${JSON.stringify(item.especificacoes_selecionadas)}`} className="flex justify-between py-2.5 text-sm">
                <div className="flex-1">
                  <span className="font-semibold text-gray-800">{item.quantidade}x {item.nome}</span>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {Object.entries(item.especificacoes_selecionadas)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </p>
                </div>
                <span className="font-semibold text-gray-800 flex-shrink-0 ml-4">
                  {formatMoney(item.preco * item.quantidade)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between items-baseline">
            <span className="font-display font-bold text-lg text-primary">Total</span>
            <span className="font-display font-bold text-2xl text-primary">{formatMoney(order.total)}</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="card bg-gold/5 border-gold/20 p-5 mb-8">
          <div className="flex items-start gap-4">
            <Clock size={24} className="text-gold flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-bold text-primary mb-1">Próximos Passos</h3>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>Nossa equipe entrará em contato pelo WhatsApp em até 2 horas úteis.</li>
                <li>Confirmaremos o prazo de produção e a forma de pagamento.</li>
                <li>Você poderá acompanhar o status do pedido na área "Acompanhar".</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center no-print">
          <button onClick={handlePrint} className="btn btn-outline flex-1 sm:flex-none">
            <Printer size={18} />
            Imprimir Recibo
          </button>
          <Link to="/acompanhar" className="btn btn-dark flex-1 sm:flex-none">
            Acompanhar Pedido
          </Link>
          <Link to="/catalogo" className="btn btn-primary flex-1 sm:flex-none">
            <ArrowRight size={18} />
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
