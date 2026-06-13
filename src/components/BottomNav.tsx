import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function BottomNav() {
  const location = useLocation();
  const { cart } = useApp();
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0);

  // Hide bottom nav on admin pages and checkout
  if (location.pathname.startsWith('/admin') || location.pathname === '/checkout') {
    return null;
  }

  const navItems = [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/catalogo', icon: Grid3X3, label: 'Catálogo' },
    { 
      to: '/carrinho', 
      icon: ShoppingCart, 
      label: 'Carrinho',
      badge: cartCount > 0 ? cartCount : undefined
    },
    { to: '/minha-conta', icon: User, label: 'Conta' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-bottom-nav safe-bottom sm:hidden">
      <div className="max-w-5xl mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-gold text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1 border border-white">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
