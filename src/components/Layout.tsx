import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      
      {/* Desktop Footer */}
      <footer className="hidden sm:block bg-primary text-white mt-16">
        <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-gold font-display font-bold text-xl">W</span>
              </div>
              <span className="font-display font-bold text-xl">
                Gráfica <span className="gold-text">W Criações</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Impressos, brindes e personalizados com padrão premium. Qualidade e compromisso em cada detalhe.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Loja</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/catalogo" className="hover:text-gold transition-colors">Catálogo</a></li>
              <li><a href="/carrinho" className="hover:text-gold transition-colors">Carrinho</a></li>
              <li><a href="/acompanhar" className="hover:text-gold transition-colors">Acompanhar Pedido</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>WhatsApp: (88) 99624-0470</li>
              <li>Email: contato@graficawcriacoes.com</li>
              <li>Seg a Sex: 8h às 18h</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/privacidade" className="hover:text-gold transition-colors">Política de Privacidade</a></li>
              <li><a href="/termos" className="hover:text-gold transition-colors">Termos de Serviço</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Gráfica W Criações. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
