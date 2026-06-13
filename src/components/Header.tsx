import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BRAND } from '../lib/api';
import { BottomSheet } from './BottomSheet';

export function Header() {
  const { cart, user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0);

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/acompanhar', label: 'Acompanhar' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/contato', label: 'Contato' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-display font-bold text-lg">W</span>
            </div>
            <span className="font-display font-bold text-primary text-lg truncate hidden sm:block">
              Gráfica <span className="gold-text">W Criações</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="p-2.5 rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100 transition-colors"
              aria-label="Minha conta"
            >
              <User size={20} />
            </Link>

            <Link
              to="/carrinho"
              className="relative p-2.5 rounded-xl bg-primary text-white active:bg-secondary transition-colors"
              aria-label="Carrinho"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-primary text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100 transition-colors sm:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav className="grid gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                location.pathname === link.to
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-700 active:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          <div className="h-px bg-gray-200 my-2" />
          
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold bg-success text-white active:bg-green-700 transition-colors"
          >
            Chamar no WhatsApp
          </a>

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold bg-gold/10 text-gold active:bg-gold/20 transition-colors mt-2"
            >
              Painel Admin
            </Link>
          )}
        </nav>
      </BottomSheet>
    </>
  );
}
