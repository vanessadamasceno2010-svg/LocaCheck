import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, LocalOrder } from '../lib/api';

type User = {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
} | null;

type AppContextType = {
  user: User;
  setUser: (user: User) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, specs: Record<string, string>) => void;
  removeFromCart: (productId: string, specs: Record<string, string>) => void;
  updateQuantity: (productId: string, specs: Record<string, string>, quantity: number) => void;
  clearCart: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('gp_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('gp_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('gp_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gp_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('gp_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity: number, specs: Record<string, string>) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantidade += quantity;
        return updated;
      }

      return [...prev, { ...product, quantidade: quantity, especificacoes_selecionadas: specs }];
    });
  };

  const removeFromCart = (productId: string, specs: Record<string, string>) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.id === productId && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs))
      )
    );
  };

  const updateQuantity = (productId: string, specs: Record<string, string>, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, specs);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs)
          ? { ...item, quantidade: quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
