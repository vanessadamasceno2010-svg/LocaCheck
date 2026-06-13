import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Package, ShoppingCart, Users, Settings } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="text-gold font-display font-bold text-lg">W</span>
            </div>
            <div>
              <p className="font-display font-bold text-sm">Painel Admin</p>
              <p className="text-xs text-gray-300">Gráfica W Criações</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-xl bg-white/10 active:bg-white/20 transition-colors"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 py-4 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    isActive ? 'bg-gold text-primary' : 'text-white/80 hover:bg-white/10'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors mt-4 border-t border-white/10 pt-4"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-64 bg-primary text-white fixed top-0 bottom-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="text-gold font-display font-bold text-xl">W</span>
            </div>
            <div>
              <p className="font-display font-bold">Painel Admin</p>
              <p className="text-xs text-gray-400">Gráfica W Criações</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                  isActive ? 'bg-white text-primary' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 sm:ml-64 pt-16 sm:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
