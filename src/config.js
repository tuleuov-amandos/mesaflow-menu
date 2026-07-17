// Fonte única da URL pública da demo (MesaFlow Menu — Beco da Chapa).
// Ao trocar de domínio/deploy, atualize SITE_URL aqui e:
//   1. espelhe o mesmo valor em <link rel="canonical"> e <meta property="og:url"> no index.html;
//   2. regenere o QR local (assets/images/qr-code.png) para apontar para SITE_URL.
export const SITE_URL = 'https://mesaflow-menu.vercel.app';

// URL da API de pedidos (backend MesaFlow no Render). Preencha DEPOIS de criar
// o Web Service no Render (ex.: 'https://mesaflow-api.onrender.com'). Enquanto
// estiver vazia, produção segue apenas pelo WhatsApp, sem tentar chamar a API.
const PROD_API_URL = 'https://mesaflow-api-1hys.onrender.com';

// Base da API por ambiente: local usa o backend em localhost:3333; produção usa
// PROD_API_URL. Nunca aponta para localhost fora da máquina de desenvolvimento —
// assim o navegador do visitante da Vercel jamais tenta acessar localhost.
function resolveApiUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return isLocal ? 'http://localhost:3333' : PROD_API_URL;
}

export const API_URL = resolveApiUrl();

// Slug padrão quando o subdomínio não identifica um estabelecimento
// (domínio raiz, preview da Vercel, localhost sem ?r=).
const DEFAULT_SLUG = 'beco-da-chapa';

// Resolve qual estabelecimento carregar. Prioridade:
//   1. ?r=<slug> na URL (útil para testar tenants em localhost/preview);
//   2. primeiro rótulo do subdomínio (ex.: beco.seu-dominio.kz -> 'beco');
//   3. DEFAULT_SLUG.
export function resolveSlug() {
  if (typeof window === 'undefined') return DEFAULT_SLUG;

  const override = new URLSearchParams(window.location.search).get('r');
  if (override) return override.trim().toLowerCase();

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (isLocal) return DEFAULT_SLUG;

  const parts = host.split('.');
  // Precisa de subdomínio real (a.b.c). Ignora www e domínios de 1–2 rótulos.
  if (parts.length > 2 && parts[0] !== 'www') return parts[0].toLowerCase();

  return DEFAULT_SLUG;
}

// Slug do estabelecimento ativo (deve casar com o registro em tenants/index.js
// e com o seed do backend).
export const RESTAURANT_SLUG = resolveSlug();
