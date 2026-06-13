import { useNavigate } from 'react-router-dom';
import { User, MapPin, Clock, Heart, LogOut, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function MinhaConta() {
  const { user, setUser } = useApp();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    navigate('/');
  };

  const menuItems = [
    { icon: User, label: 'Dados Pessoais', desc: 'Nome, email e senha' },
    { icon: MapPin, label: 'Endereços Salvos', desc: 'Gerencie seus endereços de entrega' },
    { icon: Clock, label: 'Histórico de Pedidos', desc: 'Acompanhe suas compras anteriores' },
    { icon: Heart, label: 'Favoritos', desc: 'Produtos que você salvou' },
  ];

  return (
    <div className="fade-in max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold text-primary mb-8">Minha Conta</h1>

      {/* Profile Card */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-primary to-secondary text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <User size={32} className="text-gold" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{user.nome}</h2>
            <p className="text-gray-300 text-sm">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-bold uppercase">
              {user.role === 'admin' ? 'Administrador' : 'Cliente'}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid gap-4 mb-8">
        {menuItems.map(({ icon: Icon, label, desc }) => (
          <button
            key={label}
            className="card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Icon size={22} className="text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-primary">{label}</h3>
              <p className="text-sm text-gray-500 truncate">{desc}</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full card p-5 flex items-center justify-center gap-3 text-danger font-bold hover:bg-red-50 transition-colors active:scale-[0.98]"
      >
        <LogOut size={20} />
        Sair da Conta
      </button>
    </div>
  );
}
