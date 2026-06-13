import { useState } from 'react';
import { Search, Eye, Printer } from 'lucide-react';
import { formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const mockOrders = [
  { id: 'WC1718000001', client: 'João Silva', date: '12/06/2026', status: 'em_producao', total: 245.00 },
  { id: 'WC1718000002', client: 'Maria Oliveira', date: '12/06/2026', status: 'pendente', total: 89.90 },
  { id: 'WC1718000003', client: 'Pedro Santos', date: '11/06/2026', status: 'pronto', total: 520.00 },
  { id: 'WC1718000004', client: 'Ana Costa', date: '10/06/2026', status: 'entregue', total: 135.50 },
];

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  em_producao: 'bg-purple-100 text-purple-700',
  pronto: 'bg-success/10 text-success',
  enviado: 'bg-indigo-100 text-indigo-700',
  entregue: 'bg-gray-100 text-gray-600',
};

export function Pedidos() {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const filtered = mockOrders.filter((o) =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Pedidos</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por número ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      <div className="card overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Número</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Cliente</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Data</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">Total</th>
                <th className="text-right px-6 py-4 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-primary">{order.id}</td>
                  <td className="px-6 py-4">{order.client}</td>
                  <td className="px-6 py-4 text-gray-500">{order.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">{formatMoney(order.total)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((order) => (
            <div key={order.id} className="p-4" onClick={() => setSelectedOrder(order)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono font-bold text-primary">{order.id}</p>
                  <p className="text-sm text-gray-600">{order.client}</p>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{order.date}</span>
                <span className="font-bold text-primary">{formatMoney(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Pedido ${selectedOrder?.id}`}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-semibold">{selectedOrder.client}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-bold text-primary text-lg">{formatMoney(selectedOrder.total)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Alterar Status</p>
              <select className="input" defaultValue={selectedOrder.status}>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="btn btn-outline flex-1">Imprimir Recibo</button>
              <button className="btn btn-primary flex-1">Salvar Alterações</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
