export const STORE = {
  name: 'Зёрна',
  slogan: 'Свежеобжаренный кофе, сваренный с любовью.',
  // Номер WhatsApp, на который приходят заказы из оформления (центральная настройка — код страны+код города+номер).
  // Демо с вымышленным номером; замените на реальный для продакшена.
  whatsapp: '77001234567',
  deliveryTime: '25–40 мин',
  minOrder: 2000,
  deliveryFee: 600,
  freeDeliveryAbove: 5000,
  rating: 4.9,
  totalOrders: '1.2k',
  schedule: {
    weekdays: 'Пн–Пт: 08:00 – 22:00',
    weekends: 'Сб–Вс: 09:00 – 23:00',
  },
  social: {
    instagram: '#',
    ifood: '#',
    whatsapp: '#',
  },
  address: 'ул. Кофейная, 42 — центр, Алматы',
  phone: '+7 (700) 123-45-67',
  heroImage: 'assets/images/hero.jpg',
  aboutImages: {
    ambiente: 'assets/images/about-ambiente.jpg',
    cozinha:  'assets/images/about-cozinha.jpg',
    burger:   'assets/images/about-burger.jpg',
  },
};

export const CATEGORY_META = {
  coffee:   { emoji: '☕', gradient: 'linear-gradient(135deg, #f3e9dd, #e8d7c3)' },
  combos:   { emoji: '🎁', gradient: 'linear-gradient(135deg, #ece7f6, #dbd0ee)' },
  pastry:   { emoji: '🥐', gradient: 'linear-gradient(135deg, #f5ecda, #eadfc4)' },
  drinks:   { emoji: '🧋', gradient: 'linear-gradient(135deg, #e4edf6, #cfe0ef)' },
  desserts: { emoji: '🍰', gradient: 'linear-gradient(135deg, #f6e6ee, #eed0de)' },
  syrups:   { emoji: '🍯', gradient: 'linear-gradient(135deg, #e9f0de, #d6e4c2)' },
};

export const CATEGORIES = [
  { id: 'all',      label: 'Все' },
  { id: 'coffee',   label: 'Кофе' },
  { id: 'combos',   label: 'Комбо' },
  { id: 'pastry',   label: 'Выпечка' },
  { id: 'drinks',   label: 'Напитки' },
  { id: 'desserts', label: 'Десерты' },
  { id: 'syrups',   label: 'Сиропы' },
];

const COFFEE_CUSTOMIZATIONS = {
  removes: ['Без сахара', 'Без корицы', 'Без молочной пены'],
  extras: [
    { label: 'Дополнительный шот эспрессо', price: 300 },
    { label: 'Сироп на выбор', price: 250 },
    { label: 'Взбитые сливки', price: 250 },
    { label: 'Растительное молоко', price: 300 },
  ],
  supportsSize: true,
  sizeOptions: ['S · 250 мл', 'M · 350 мл', 'L · 450 мл'],
  defaultSize: 'M · 350 мл',
};

const COMBO_DRINKS = ['Капучино', 'Латте', 'Американо', 'Чай листовой', 'Какао'];

export const PRODUCTS = [
  // ─── Кофе ───────────────────────────────
  {
    id: 1,
    name: 'Капучино Классический',
    description: 'Двойной эспрессо, бархатистая молочная пена и щепотка какао сверху',
    price: 1200,
    category: 'coffee',
    image: 'assets/images/products/01-brasa-classico.jpg',
    badge: 'Хит продаж',
    badgeType: 'hot',
    featured: true,
    available: true,
    prepTime: '3–5 мин',
    customizations: COFFEE_CUSTOMIZATIONS,
  },
  {
    id: 2,
    name: 'Флэт Уайт Двойной',
    description: 'Два шота эспрессо и тонко текстурированное молоко с плотной кремовой текстурой',
    price: 1500,
    category: 'coffee',
    image: 'assets/images/products/02-smash-duplo.jpg',
    badge: null,
    badgeType: null,
    featured: true,
    available: true,
    prepTime: '3–5 мин',
    customizations: { ...COFFEE_CUSTOMIZATIONS, supportsSize: false },
  },
  {
    id: 3,
    name: 'Латте Карамель',
    description: 'Эспрессо, нежное молоко, домашний карамельный сироп и карамельный топпинг',
    price: 1400,
    category: 'coffee',
    image: 'assets/images/products/03-cheddar-bacon-crispy.jpg',
    badge: 'Новинка',
    badgeType: 'new',
    featured: false,
    available: true,
    prepTime: '4–6 мин',
    customizations: COFFEE_CUSTOMIZATIONS,
  },
  {
    id: 4,
    name: 'Раф Ванильный',
    description: 'Эспрессо, взбитые сливки и ванильный сахар — фирменный нежный напиток заведения',
    price: 1600,
    category: 'coffee',
    image: 'assets/images/products/04-cogumelo-brie.jpg',
    badge: 'Фирменный',
    badgeType: 'featured',
    featured: false,
    available: true,
    prepTime: '4–6 мин',
    customizations: {
      ...COFFEE_CUSTOMIZATIONS,
      removes: ['Без ванильного сахара', 'Без корицы'],
    },
  },
  {
    id: 5,
    name: 'Капучино на растительном молоке',
    description: 'Эспрессо и вспененное миндальное, кокосовое или овсяное молоко на выбор',
    price: 1450,
    category: 'coffee',
    image: 'assets/images/products/05-frango-nashville.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '3–5 мин',
    customizations: {
      removes: ['Без сахара', 'Без корицы'],
      extras: [
        { label: 'Дополнительный шот эспрессо', price: 300 },
        { label: 'Сироп на выбор', price: 250 },
        { label: 'Взбитые сливки', price: 250 },
      ],
      sizeOptions: null,
    },
  },
  {
    id: 6,
    name: 'Колд Брю',
    description: 'Холодный кофе медленного 12-часового настаивания, подаётся со льдом. Мягкий и освежающий',
    price: 1350,
    category: 'coffee',
    image: 'assets/images/products/06-bbq-smokehouse.jpg',
    badge: null,
    badgeType: null,
    featured: true,
    available: true,
    prepTime: '2–4 мин',
    customizations: {
      ...COFFEE_CUSTOMIZATIONS,
      removes: ['Без льда', 'Без сахара'],
    },
  },

  // ─── Комбо ──────────────────────────────
  {
    id: 7,
    name: 'Комбо «Утро»',
    description: 'Капучино Классический + Круассан Классический + напиток на ваш выбор',
    price: 1990,
    category: 'combos',
    image: 'assets/images/products/07-combo-brasa.jpg',
    badge: 'Комбо',
    badgeType: 'combo',
    featured: false,
    available: true,
    prepTime: '5–8 мин',
    drinkOptions: COMBO_DRINKS,
  },
  {
    id: 8,
    name: 'Комбо «Двойной»',
    description: '2 напитка на выбор + Синнабон + Брауни. Идеально на двоих',
    price: 3490,
    category: 'combos',
    image: 'assets/images/products/08-combo-duplo.jpg',
    badge: 'Комбо',
    badgeType: 'combo',
    featured: false,
    available: true,
    prepTime: '8–12 мин',
    drinkOptions: COMBO_DRINKS,
  },
  {
    id: 9,
    name: 'Комбо «Компания»',
    description: '4 напитка на выбор + 4 круассана + 2 десерта. Отлично для встречи с друзьями',
    price: 5990,
    category: 'combos',
    image: 'assets/images/products/09-combo-familia.jpg',
    badge: 'Комбо',
    badgeType: 'combo',
    featured: false,
    available: true,
    prepTime: '12–18 мин',
    drinkOptions: COMBO_DRINKS,
  },

  // ─── Выпечка ────────────────────────────
  {
    id: 10,
    name: 'Круассан Классический',
    description: 'Слоёный круассан из французского теста, хрустящий снаружи и воздушный внутри',
    price: 900,
    category: 'pastry',
    image: 'assets/images/products/10-batata-tradicional.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '2–4 мин',
    customizations: null,
  },
  {
    id: 11,
    name: 'Синнабон с корицей',
    description: 'Тёплая булочка с корицей под сливочно-сырной глазурью. Подаётся горячей',
    price: 1200,
    category: 'pastry',
    image: 'assets/images/products/11-batata-cheddar-bacon.jpg',
    badge: 'Хит продаж',
    badgeType: 'hot',
    featured: false,
    available: true,
    prepTime: '3–5 мин',
    customizations: null,
  },
  {
    id: 12,
    name: 'Маффин Черничный',
    description: 'Домашний маффин со свежей черникой и хрустящей сахарной корочкой',
    price: 1000,
    category: 'pastry',
    image: 'assets/images/products/12-onion-rings.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '2–4 мин',
    customizations: null,
  },

  // ─── Напитки ────────────────────────────
  {
    id: 13,
    name: 'Чай листовой',
    description: 'Чёрный, зелёный или травяной — заваривается порционно, 400 мл',
    price: 900,
    category: 'drinks',
    image: 'assets/images/products/13-refrigerante.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 14,
    name: 'Свежевыжатый сок',
    description: 'Апельсин, яблоко или грейпфрут — отжимаем при вас, 400 мл',
    price: 1300,
    category: 'drinks',
    image: 'assets/images/products/14-suco-natural.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 15,
    name: 'Молочный коктейль',
    description: 'Ваниль, шоколад или клубника. Готовим на премиальном мороженом и цельном молоке — 400 мл',
    price: 1400,
    category: 'drinks',
    image: 'assets/images/products/15-milkshake.jpg',
    badge: 'Новинка',
    badgeType: 'new',
    featured: false,
    available: true,
    prepTime: '3–5 мин',
    customizations: null,
  },
  {
    id: 16,
    name: 'Вода',
    description: 'Питьевая, с газом или без — 500 мл',
    price: 500,
    category: 'drinks',
    image: 'assets/images/products/16-agua.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 17,
    name: 'Матча Латте',
    description: 'Японская матча церемониального сорта со вспененным молоком — 350 мл',
    price: 1500,
    category: 'drinks',
    image: 'assets/images/products/17-cerveja.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '3–5 мин',
    customizations: null,
  },

  // ─── Десерты ─────────────────────────────
  {
    id: 18,
    name: 'Брауни с мороженым',
    description: 'Тёплый шоколадный брауни из бельгийского шоколада с ванильным мороженым и солёной карамелью',
    price: 1400,
    category: 'desserts',
    image: 'assets/images/products/18-brownie.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '3–5 мин',
    customizations: null,
  },
  {
    id: 19,
    name: 'Чизкейк Нью-Йорк',
    description: 'Классический сливочный чизкейк на песочной основе с ягодным соусом',
    price: 1300,
    category: 'desserts',
    image: 'assets/images/products/19-sundae.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: '2–4 мин',
    customizations: null,
  },

  // ─── Сиропы и добавки ───────────────────
  {
    id: 20,
    name: 'Карамельный сироп',
    description: 'Добавка домашнего карамельного сиропа к любому напитку',
    price: 250,
    category: 'syrups',
    image: 'assets/images/products/20-molho-especial.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 21,
    name: 'Ванильный сироп',
    description: 'Ароматный ванильный сироп — нежный акцент для кофе',
    price: 250,
    category: 'syrups',
    image: 'assets/images/products/21-barbecue.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 22,
    name: 'Ореховый сироп',
    description: 'Сироп с нотами лесного ореха и фундука для насыщенного вкуса',
    price: 250,
    category: 'syrups',
    image: 'assets/images/products/22-aioli.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
  {
    id: 23,
    name: 'Взбитые сливки',
    description: 'Порция свежих взбитых сливок — идеально к кофе и десертам',
    price: 350,
    category: 'syrups',
    image: 'assets/images/products/23-cheddar-cremoso.jpg',
    badge: null,
    badgeType: null,
    featured: false,
    available: true,
    prepTime: null,
    customizations: null,
  },
];

export function isStoreOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? hour >= 9 && hour < 23 : hour >= 8 && hour < 22;
}

export function formatPrice(value) {
  // Форматируем вручную: ICU в ряде окружений выводит код «KZT» вместо символа «₸».
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

// Популярные позиции («хиты») для первого экрана: клиент, который уже знает меню,
// заказывает любимое в один тап, не листая категории. Ранжируем детерминированно —
// сначала избранные и «Хит продаж», затем остальные помеченные бейджем позиции,
// сохраняя порядок меню при равенстве.
export function getPopularProducts(limit = 8) {
  const score = (p) => {
    let s = 0;
    if (p.featured) s += 3;
    if (p.badge === 'Хит продаж') s += 3;
    else if (p.badgeType === 'featured') s += 2; // «Фирменный»
    else if (p.badge) s += 1;                     // «Новинка», «Комбо» и т.п.
    return s;
  };
  return PRODUCTS
    .map((product, index) => ({ product, index, score: score(product) }))
    .filter((entry) => entry.product.available && entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export const REVIEWS = [
  {
    name: 'Карлос С.',
    initials: 'КС',
    color: '#f97316',
    rating: 5,
    text: 'Лучший кофе в городе. Заходил трижды за эту неделю и ни капли не жалею. Флэт Уайт просто затягивает!',
    time: '2 дня назад',
  },
  {
    name: 'Анна Родригес',
    initials: 'АР',
    color: '#8b5cf6',
    rating: 5,
    text: 'Быстрая доставка, аккуратная упаковка, а Латте Карамель — это что-то невероятное. Очень рекомендую!',
    time: '4 дня назад',
  },
  {
    name: 'Пётр Лима',
    initials: 'ПЛ',
    color: '#06b6d4',
    rating: 5,
    text: 'Раф Ванильный убрали из меню моего любимого места, но в «Зёрнах» его готовят ещё лучше. Молодцы!',
    time: 'неделю назад',
  },
  {
    name: 'Юлия М.',
    initials: 'ЮМ',
    color: '#10b981',
    rating: 5,
    text: 'Заказала Комбо «Компания» на день рождения сына. Всё приехало горячим, красиво упаковано, и всем понравилось!',
    time: 'неделю назад',
  },
  {
    name: 'Рафаэль Коста',
    initials: 'РК',
    color: '#ef4444',
    rating: 5,
    text: 'Колд Брю с Синнабоном — мой заказ каждую неделю. Качество всегда на высоте.',
    time: '2 недели назад',
  },
];

export const PROMO_BANNERS = [
  { icon: '🎉', text: 'Бесплатная доставка при заказе от 5000 ₸!' },
  { icon: '☕', text: 'Комбо недели: Флэт Уайт + Круассан + напиток за 1990 ₸' },
  { icon: '⭐', text: 'Новинка! Латте Карамель — эспрессо с домашним карамельным сиропом' },
  { icon: '💳', text: 'Принимаем Kaspi, все карты и наличные при получении' },
];
