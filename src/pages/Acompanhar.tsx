import { useState } from 'react';
import { Search, Package, CheckCircle2, Clock, Truck } from 'lucide-react';

const steps = [
  { id: 'pendente', label: 'Pendente', icon: Clock },
  { id: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
  { id: 'em_producao', label: 'Em Produção', icon: Package },
  { id: 'pronto', label: 'Pronto', icon: CheckCircle2 },
  { id: 'enviado', label: 'Enviado', icon: Truck },
  { id: 'entregue', label: 'Entregue', icon: CheckCircle2 },
];

export function Acompanhar() {
  const [pedidoNumero, setPedidoNumero] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');

  const handleSearch = () => {
    if (!pedidoNumero.trim()) return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('found');
    }, 800);
  };

  const currentStepIndex = 2; // Simulating "em_producao"

  return (
    <div className="fade-in max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold text-primary mb-2 text-center sm:text-left">
        Acompanhar Pedido
      </h1>
      <p className="text-gray-500 mb-8 text-center sm:text-left">
        Digite o número do seu pedido e o email cadastrado para verificar o status.
      </p>

      <div className="card p-5 sm:p-6 mb-8">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número do Pedido</label>
            <input
              type="text"
              value={pedidoNumero}
              onChange={(e) => setPedidoNumero(e.target.value)}
              className="input"
              placeholder="Ex: WC1234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="seu@email.com"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={status === 'loading' || !pedidoNumero.trim()}
          className="btn btn-primary w-full sm:w-auto mt-6 disabled:opacity-70"
        >
          {status === 'loading' ? (
            'Buscando...'
          ) : (
            <>
              <Search size={18} />
              Buscar Pedido
            </>
          )}
        </button>
      </div>

      {status === 'found' && (
        <div className="card p-6 sm:p-8 fade-in">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 text-gold text-sm font-bold mb-4">
              <Clock size={16} />
              Em Produção
            </span>
            <h2 className="font-display text-2xl font-bold text-primary mb-2">
              Pedido {pedidoNumero}
            </h2>
            <p className="text-gray-500">
              Previsão de entrega: <span className="font-semibold text-primary">7 dias úteis</span>
            </p>
          </div>

          {/* Progress Steps */}
          <div className="relative">
            {/* Line */}
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />
            
            <div className="space-y-8 relative">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex items-center gap-4 sm:gap-6">
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-4 transition-all ${
                        isCompleted
                          ? 'bg-gold border-gold/20 text-primary'
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold ${isCompleted ? 'text-primary' : 'text-gray-400'}`}>
                        {step.label}
                      </h3>
                      {isCurrent && (
                        <p className="text-sm text-gray-500 mt-1">
                          Seu pedido está sendo produzido com todo cuidado.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600 mb-4">
              Precisa de ajuda com este pedido?
            </p>
            <a
              href="https://wa.me/5588996240470"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whats inline-flex"
            >
              Falar com o Atendimento
            </a>
          </div>
        </div>
      )}

      {status === 'not_found' && (
        <div className="card p-8 text-center fade-in">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-primary mb-2">Pedido não encontrado</h3>
          <p className="text-gray-500 mb-6">
            Verifique se o número do pedido e o email estão corretos.
          </p>
          <button onClick={() => setStatus('idle')} className="btn btn-outline">
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
