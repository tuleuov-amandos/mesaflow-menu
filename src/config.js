// Единственный источник публичного URL демо (MesaFlow Menu — «Зёрна»).
// При смене домена/деплоя обновите SITE_URL здесь и:
//   1. продублируйте то же значение в <link rel="canonical"> и <meta property="og:url"> в index.html;
//   2. перегенерируйте локальный QR (assets/images/qr-code.png), чтобы он указывал на SITE_URL.
export const SITE_URL = 'https://mesaflow-menu.vercel.app';

// URL API заказов (бэкенд MesaFlow на Render). Заполните ПОСЛЕ создания
// Web Service на Render (напр.: 'https://mesaflow-api.onrender.com'). Пока
// значение пустое, продакшен работает только через WhatsApp, не обращаясь к API.
const PROD_API_URL = 'https://mesaflow-api-1hys.onrender.com';

// База API по окружению: локально — бэкенд на localhost:3333; в продакшене —
// PROD_API_URL. Никогда не указывает на localhost вне машины разработки —
// так браузер посетителя на Vercel никогда не пытается обратиться к localhost.
function resolveApiUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return isLocal ? 'http://localhost:3333' : PROD_API_URL;
}

export const API_URL = resolveApiUrl();

// Slug кофейни в бэкенде (должен совпадать с сидом).
export const RESTAURANT_SLUG = 'beco-da-chapa';
