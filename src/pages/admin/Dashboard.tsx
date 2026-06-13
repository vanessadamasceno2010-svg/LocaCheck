import { DollarSign, ShoppingCart, Users, Package, TrendingUp, Clock } from 'lucide-react';

export function Dashboard() {
  const stats = [
    { label: 'Vendas do Mês', value: 'R$ 28.450,00', icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pedidos do Mês', value: '184', icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Ticket Médio', value: 'R$ 154,61', icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Clientes Novos', value: '72', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="font-display text-xl sm:text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Charts Placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-primary mb-4">Vendas por Período</h2>
          <div className="h-64 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
            <div className="text-center">
              <TrendingUp size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gráfico de vendas (integração futura)</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-primary mb-4">Status dos Pedidos</h2>
          <div className="space-y-4">
            {[
              { label: 'Pendentes', count: 18, color: 'bg-yellow-500' },
              { label: 'Em Produção', count: 42, color: 'bg-blue-500' },
              { label: 'Prontos', count: 12, color: 'bg-success' },
              { label: 'Entregues', count: 112, color: 'bg-gray-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="flex-1 text-gray-600">{label}</span>
                <span className="font-bold text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card mt-6 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Pedidos Recentes</h2>
          <button className="text-sm text-gold font-semibold hover:underline">Ver todos</button>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { id: 'WC123456', client: 'João Silva', status: 'Em Produção', total: 'R$ 245,00', time: '2h atrás' },
            { id: 'WC123455', client: 'Maria Oliveira', status: 'Pendente', total: 'R$ 89,90', time: '4h atrás' },
            { id: 'WC123454', client: 'Pedro Santos', status: 'Pronto', total: 'R$ 520,00', time: '1d atrás' },
          ].map((order) => (
            <div key={order.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm sm:text-base">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.client}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{order.total}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-semibold">
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
