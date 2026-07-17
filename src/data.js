// ─────────────────────────────────────────────────────────────────────────────
// Carregador de dados do estabelecimento ativo (multi-tenant).
//
// O slug é resolvido pelo subdomínio (ver resolveSlug em config.js). Este módulo
// importa o tenant correspondente e reexporta seus dados com a mesma forma de
// antes (STORE, PRODUCTS, CATEGORIES, ...), então o restante do frontend não
// muda. Para trocar o cardápio por uma API no futuro, este é o único ponto de
// troca.
//
// Usa top-level await: os módulos que importam daqui aguardam o carregamento.
// ─────────────────────────────────────────────────────────────────────────────

import { RESTAURANT_SLUG } from './config.js';
import { resolveTenantLoader } from './tenants/index.js';

const tenant = await resolveTenantLoader(RESTAURANT_SLUG)();

export const STORE = tenant.STORE;
export const CATEGORY_META = tenant.CATEGORY_META;
export const CATEGORIES = tenant.CATEGORIES;
export const PRODUCTS = tenant.PRODUCTS;
export const REVIEWS = tenant.REVIEWS ?? [];
export const PROMO_BANNERS = tenant.PROMO_BANNERS ?? [];

// ─── Helpers compartilhados (iguais para todos os tenants) ───────────────────

export function isStoreOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? hour >= 12 && hour < 23.5 : hour >= 18 && hour < 23;
}

export function formatPrice(value) {
  const locale = STORE.locale ?? 'pt-BR';
  const currency = STORE.currency ?? 'BRL';
  return value.toLocaleString(locale, { style: 'currency', currency });
}
