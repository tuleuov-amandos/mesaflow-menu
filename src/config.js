// Fonte única da URL pública da demo (MesaFlow Menu — Beco da Chapa).
// Ao trocar de domínio/deploy, atualize SITE_URL aqui e:
//   1. espelhe o mesmo valor em <link rel="canonical"> e <meta property="og:url"> no index.html;
//   2. regenere o QR local (assets/images/qr-code.png) para apontar para SITE_URL.
export const SITE_URL = 'https://mesaflow-menu.vercel.app';

// Base da API de pedidos (backend MesaFlow). Só é usada em ambiente local:
// em produção/Vercel fica vazia ('') para não tentar chamar localhost do
// navegador do visitante — nesse caso o checkout segue apenas pelo WhatsApp.
function resolveApiUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return isLocal ? 'http://localhost:3333' : '';
}

export const API_URL = resolveApiUrl();

// Slug do restaurante no backend (deve casar com o seed).
export const RESTAURANT_SLUG = 'beco-da-chapa';
