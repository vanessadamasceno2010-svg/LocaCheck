import { Sparkles, Target, Eye, ShieldCheck } from 'lucide-react';

export function Sobre() {
  const values = [
    { icon: Target, title: 'Missão', desc: 'Oferecer soluções gráficas de alta qualidade que valorizem a identidade visual de cada cliente, com agilidade e compromisso.' },
    { icon: Eye, title: 'Visão', desc: 'Ser referência regional em impressão personalizada, reconhecida pela excelência no atendimento e inovação nos acabamentos.' },
    { icon: ShieldCheck, title: 'Valores', desc: 'Qualidade, transparência, respeito ao cliente e paixão por transformar ideias em produtos tangíveis de impacto.' },
  ];

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-6 text-center sm:text-left">
        Sobre a Gráfica W Criações
      </h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles size={24} className="text-gold" />
              <h2 className="font-display text-2xl font-bold text-primary">Quem Somos</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-lg mb-6">
              Somos uma gráfica moderna focada em impressos personalizados, atendimento ágil e acabamento premium. 
              Unimos tecnologia de ponta, design estratégico e produção cuidadosa para entregar materiais que 
              realmente valorizam marcas e negócios.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Desde nossos primeiros pedidos, o compromisso com a qualidade e a satisfação do cliente tem sido 
              o pilar que sustenta nosso crescimento. Cada projeto é tratado com atenção especial, garantindo 
              que o resultado final supere as expectativas.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-gold" />
                </div>
                <h3 className="font-display font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-display text-xl font-bold text-primary mb-4">Certificações e Qualidade</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span>Processos de produção revisados e padronizados</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span>Controle rigoroso de qualidade em cada etapa</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span>Equipe especializada e treinada continuamente</span>
              </li>
            </ul>
          </div>

          <div className="card overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&q=80" 
              alt="Equipe trabalhando" 
              className="w-full h-48 object-cover"
            />
            <div className="p-5">
              <p className="text-sm text-gray-500 italic">
                "Transformamos suas ideias em materiais que geram resultados reais para o seu negócio."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
