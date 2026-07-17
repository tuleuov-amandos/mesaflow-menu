// ─────────────────────────────────────────────────────────────────────────────
// MODELO de estabelecimento — copie este arquivo para src/tenants/<slug>.js,
// preencha os dados e registre o slug em src/tenants/index.js.
//
// Design (layout, componentes, CSS) é compartilhado entre todos os tenants.
// Aqui muda só: marca (logo/nome/cor), contatos, cardápio e preços.
// ─────────────────────────────────────────────────────────────────────────────

export const STORE = {
  name: 'Nome do Estabelecimento',
  slogan: 'Seu slogan aqui.',
  whatsapp: '5511999999999',        // DDI+DDD+número, só dígitos
  deliveryTime: '25–40 min',
  minOrder: 30.00,
  deliveryFee: 8.00,
  freeDeliveryAbove: 80.00,
  rating: 5.0,
  totalOrders: '0',
  schedule: {
    weekdays: 'Seg–Sex: 09h às 20h',
    weekends: 'Sáb–Dom: 10h às 18h',
  },
  social: { instagram: '#', ifood: '#', whatsapp: '#' },
  address: 'Endereço completo',
  phone: '(11) 99999-9999',
  heroImage: 'assets/images/hero.jpg',
  aboutImages: {
    ambiente: 'assets/images/about-ambiente.jpg',
    cozinha:  'assets/images/about-cozinha.jpg',
    burger:   'assets/images/about-burger.jpg',
  },

  // ─── Marca ────────────────────────────────────────────────────────────────
  logoEmoji: '☕',                   // emoji/logo no cabeçalho, rodapé e WhatsApp
  accent: '#f97316',                 // cor de destaque da marca
  accentDark: '#c2610f',
  accentLight: 'rgba(249, 115, 22, 0.12)',
  accentBorder: 'rgba(249, 115, 22, 0.35)',
  locale: 'pt-BR',                   // ex.: 'kk-KZ' / 'ru-RU'
  currency: 'BRL',                   // ex.: 'KZT'
};

// Categorias visuais (emoji + gradiente do card). Chave = slug da categoria.
export const CATEGORY_META = {
  // exemplo: cafes: { emoji: '☕', gradient: 'linear-gradient(135deg, #1a0e00, #2d1a05)' },
};

// Abas de filtro. A primeira ('all') é obrigatória; as demais casam com CATEGORY_META.
export const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  // { id: 'cafes', label: 'Cafés' },
];

// Cardápio. Campos por produto:
//   id (número, único), name, description, price (na moeda do STORE),
//   category (slug), image, badge/badgeType (ou null), featured, available,
//   prepTime (string ou null), e opcionalmente customizations OU drinkOptions.
export const PRODUCTS = [
  // {
  //   id: 1, name: 'Espresso', description: '...', price: 900,
  //   category: 'cafes', image: 'assets/images/products/01.jpg',
  //   badge: null, badgeType: null, featured: true, available: true,
  //   prepTime: '3–5 min', customizations: null,
  // },
];

// Avaliações exibidas na home (opcional — pode ficar vazio).
export const REVIEWS = [];

// Banners rotativos de promoção (opcional — pode ficar vazio).
export const PROMO_BANNERS = [];
