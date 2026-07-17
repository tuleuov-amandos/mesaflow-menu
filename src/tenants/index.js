// ─────────────────────────────────────────────────────────────────────────────
// Registro de estabelecimentos (multi-tenant).
//
// Cada cafeteria/restaurante é um módulo em src/tenants/<slug>.js. O design é
// compartilhado; só os dados mudam. Para abrir um novo estabelecimento:
//   1. copie src/tenants/_TEMPLATE.js para src/tenants/<slug>.js e preencha;
//   2. adicione uma linha em TENANTS abaixo;
//   3. (produção) aponte o subdomínio <slug>.seu-dominio para o mesmo deploy;
//   4. rode o seed do backend para popular o banco desse estabelecimento.
//
// O slug é resolvido em runtime pelo subdomínio (ver resolveSlug em config.js).
// Os loaders usam import() dinâmico para que só o tenant ativo seja baixado.
// ─────────────────────────────────────────────────────────────────────────────

export const TENANTS = {
  'beco-da-chapa': () => import('./beco-da-chapa.js'),
};

// Estabelecimento usado quando o subdomínio não casa com nenhum tenant
// (ex.: domínio raiz, preview da Vercel, localhost sem ?r=).
export const DEFAULT_TENANT = 'beco-da-chapa';

// Retorna o loader do tenant pedido, caindo no padrão se não existir.
export function resolveTenantLoader(slug) {
  return TENANTS[slug] ?? TENANTS[DEFAULT_TENANT];
}
