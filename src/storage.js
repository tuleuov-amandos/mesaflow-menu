const CART_KEY = 'mesaflow_cart';
const FAVORITES_KEY = 'mesaflow_favorites';
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
