export const BRAND = {
  nome: 'Gráfica W Criações',
  whatsapp: '(88) 99624-0470',
  whatsappNumber: '5588996240470',
  email: 'contato@graficawcriacoes.com',
};

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export type Product = {
  id: string;
  nome: string;
  slug: string;
  categoria_nome: string;
  descricao: string;
  descricao_completa: string;
  preco: number;
  preco_original?: number;
  estoque: number;
  tempo_producao: number;
  imagem_principal: string;
  imagens_adicionais: string[];
  especificacoes: Record<string, string[]>;
  destaque: boolean;
  avaliacao_media: number;
};

export const mockCategories = [
  { id: '1', nome: 'Cartões de Visita', slug: 'cartoes-de-visita' },
  { id: '2', nome: 'Panfletos e Flyers', slug: 'panfletos' },
  { id: '3', nome: 'Brindes Personalizados', slug: 'brindes' },
  { id: '4', nome: 'Adesivos e Rótulos', slug: 'adesivos' },
  { id: '5', nome: 'Papelaria Corporativa', slug: 'papelaria' },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    nome: 'Cartão de Visita Premium',
    slug: 'cartao-de-visita-premium',
    categoria_nome: 'Cartões de Visita',
    descricao: 'Acabamento fosco com verniz localizado, papel de alta gramatura.',
    descricao_completa: 'Nossos cartões de visita premium são impressos em papel Couché 300g com acabamento fosco e verniz UV localizado no frente, garantindo um toque sofisticado e durabilidade superior. Ideal para profissionais que desejam causar uma excelente primeira impressão.',
    preco: 89.90,
    preco_original: 120.00,
    estoque: 500,
    tempo_producao: 3,
    imagem_principal: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80',
    imagens_adicionais: [
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80',
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
    ],
    especificacoes: {
      'Acabamento': ['Fosco', 'Brilhante', 'Fosco com Verniz Localizado'],
      'Quantidade': ['500 un', '1000 un', '2000 un'],
    },
    destaque: true,
    avaliacao_media: 4.8,
  },
  {
    id: '2',
    nome: 'Panfletos A5 Coloridos',
    slug: 'panfletos-a5-coloridos',
    categoria_nome: 'Panfletos e Flyers',
    descricao: 'Impressão em alta resolução, ideal para promoções e eventos.',
    descricao_completa: 'Panfletos A5 (14,8 x 21 cm) impressos em papel Couché 90g, frente colorida. Perfeito para divulgação de promoções, eventos e serviços. Qualidade de imagem excepcional e cores vibrantes.',
    preco: 149.90,
    estoque: 1000,
    tempo_producao: 2,
    imagem_principal: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      'Papel': ['Couché 90g', 'Couché 115g'],
      'Quantidade': ['1000 un', '2500 un', '5000 un'],
      'Cores': ['Frente Colorida', 'Frente e Verso Coloridos'],
    },
    destaque: true,
    avaliacao_media: 4.6,
  },
  {
    id: '3',
    nome: 'Caneca Personalizada',
    slug: 'caneca-personalizada',
    categoria_nome: 'Brindes Personalizados',
    descricao: 'Caneca de cerâmica branca com sua arte em alta definição.',
    descricao_completa: 'Caneca de cerâmica branca de 325ml com sublimação em alta definição. Resistente a micro-ondas e lava-louças. Excelente opção para brindes corporativos ou presentes personalizados.',
    preco: 35.00,
    estoque: 200,
    tempo_producao: 4,
    imagem_principal: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      'Tipo': ['Branca Clássica', 'Mágica (muda de cor)', 'Polímero'],
    },
    destaque: false,
    avaliacao_media: 4.9,
  },
  {
    id: '4',
    nome: 'Adesivos Vinil Recortado',
    slug: 'adesivos-vinil-recortado',
    categoria_nome: 'Adesivos e Rótulos',
    descricao: 'Resistentes à água e sol, com corte especial no formato da arte.',
    descricao_completa: 'Adesivos em vinil de alta durabilidade, resistentes à água e raios UV. Corte especial (recorte) no formato exato da sua arte. Ideal para rótulos de produtos, embalagens e decoração.',
    preco: 59.90,
    estoque: 300,
    tempo_producao: 3,
    imagem_principal: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&q=80',
    imagens_adicionais: [],
    especificacoes: {
      'Material': ['Vinil Branco', 'Vinil Transparente', 'Vinil Holográfico'],
      'Tamanho': ['5x5 cm', '10x10 cm', 'Personalizado'],
    },
    destaque: true,
    avaliacao_media: 4.7,
  },
];

export type CartItem = Product & {
  quantidade: number;
  especificacoes_selecionadas: Record<string, string>;
};

export type LocalOrder = {
  numero: string;
  items: CartItem[];
  cliente: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
    observacoes: string;
  };
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  created_at: string;
  status?: string;
};

export function createWhatsAppOrderMessage(order: LocalOrder): string {
  const itemsList = order.items
    .map(
      (i) =>
        `• ${i.quantidade}x ${i.nome} (${Object.entries(i.especificacoes_selecionadas)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}) - ${formatMoney(i.preco * i.quantidade)}`
    )
    .join('\n');

  return `*Novo Pedido - ${BRAND.nome}*\n\n` +
    `*Número:* ${order.numero}\n` +
    `*Cliente:* ${order.cliente.nome}\n` +
    `*Telefone:* ${order.cliente.telefone}\n` +
    `*Endereço:* ${order.cliente.endereco}\n\n` +
    `*Itens do Pedido:*\n${itemsList}\n\n` +
    `*Subtotal:* ${formatMoney(order.subtotal)}\n` +
    `*Frete:* ${order.frete === 0 ? 'A combinar' : formatMoney(order.frete)}\n` +
    `*Total:* ${formatMoney(order.total)}\n\n` +
    `*Observações:* ${order.cliente.observacoes || 'Nenhuma'}`;
}
