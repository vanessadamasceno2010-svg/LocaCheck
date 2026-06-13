import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function Login() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const user = {
        id: '1',
        nome: isAdmin ? 'Administrador' : 'Cliente',
        email: isAdmin ? 'admin@graficawcriacoes.com' : email || 'cliente@email.com',
        role: isAdmin ? 'admin' : 'user',
      } as const;

      localStorage.setItem('gp_token', 'demo-token');
      setUser(user);
      setIsLoading(false);
      navigate(isAdmin ? '/admin' : '/minha-conta');
    }, 800);
  };

  return (
    <div className="fade-in max-w-md mx-auto px-4 py-12">
      <div className="card p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Acessar Conta</h1>
          <p className="text-gray-500 mt-2">Entre com seus dados para continuar</p>
        </div>

        {/* Role Toggle */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setIsAdmin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              !isAdmin ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Cliente
          </button>
          <button
            onClick={() => setIsAdmin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isAdmin ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <ShieldCheck size={16} className="inline mr-2" />
            Administrador
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-11"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-11"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-gold" />
              <span className="text-gray-600">Lembrar-me</span>
            </label>
            <button type="button" className="text-gold font-semibold hover:underline">
              Esqueci a senha
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full text-base disabled:opacity-70"
          >
            {isLoading ? 'Entrando...' : (
              <>
                Entrar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ainda não tem conta?{' '}
          <button className="text-gold font-semibold hover:underline">
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
