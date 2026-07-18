const CART_KEY = 'mesaflow_cart';
const FAVORITES_KEY = 'mesaflow_favorites';
const PROFILE_KEY = 'mesaflow_profile';
const LAST_ORDER_KEY = 'mesaflow_last_order';
const LEGACY_CART_KEY = 'cardapiopro_cart';
const LEGACY_FAVORITES_KEY = 'cardapiopro_favorites';

function migrateLegacyKey(legacyKey, newKey) {
  try {
    if (localStorage.getItem(newKey) !== null) return;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw !== null) {
      localStorage.setItem(newKey, legacyRaw);
    }
  } catch {
    // storage may be unavailable
  } finally {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      // storage may be unavailable
    }
  }
}

migrateLegacyKey(LEGACY_CART_KEY, CART_KEY);
migrateLegacyKey(LEGACY_FAVORITES_KEY, FAVORITES_KEY);

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // storage may be unavailable
  }
}

export function clearCartStorage() {
  localStorage.removeItem(CART_KEY);
}

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFavorites(favSet) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favSet]));
  } catch {
    // storage may be unavailable
  }
}

// ─── Профиль клиента ──────────────────────────────────────────────────────────
// Имя, телефон и предпочтения (получение/оплата) запоминаются после первого
// заказа, чтобы постоянный клиент не заполнял форму заново.

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // storage may be unavailable
  }
}

// ─── Последний заказ ──────────────────────────────────────────────────────────
// Снимок позиций последнего оформленного заказа — для «Повторить заказ».

export function getLastOrder() {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastOrder(order) {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // storage may be unavailable
  }
}
