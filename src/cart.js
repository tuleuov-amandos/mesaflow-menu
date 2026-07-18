import { getCart, saveCart, clearCartStorage } from './storage.js';
import { PRODUCTS } from './data.js';

// Приводит одну позицию к текущему меню: сбрасывает размер, если товар его
// больше не поддерживает. Возвращает исходный объект, если менять нечего.
function sanitizeItem(item) {
  const product = PRODUCTS.find((p) => p.id === item.id);
  if (item.size && product?.customizations?.supportsSize === false) {
    return { ...item, size: null };
  }
  return item;
}

function sanitizeStoredItems(stored) {
  let changed = false;
  const cleaned = stored.map((item) => {
    const clean = sanitizeItem(item);
    if (clean !== item) changed = true;
    return clean;
  });
  if (changed) saveCart(cleaned);
  return cleaned;
}

let items = sanitizeStoredItems(getCart());

function syncedProducts() {
  return items.filter(item => PRODUCTS.find(p => p.id === item.id));
}

function dispatch() {
  document.dispatchEvent(new CustomEvent('cart:updated'));
}

function persist() {
  saveCart(items);
}

export function addItem(product) {
  const existing = items.find(i => i.id === product.id && !i.removes?.length && !i.extras?.length);
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({ id: product.id, name: product.name, price: product.price, basePrice: product.price, category: product.category, qty: 1 });
  }
  persist();
  dispatch();
}

export function addItemWithCustomizations(product, result) {
  const extraTotal = result.extraTotal || 0;
  items.push({
    id: product.id,
    name: product.name,
    price: product.price + extraTotal,
    basePrice: product.price,
    category: product.category,
    qty: 1,
    removes: result.removes || [],
    extras: result.extras?.map(e => e.label) || [],
    size: result.size || null,
    drinkChoice: result.drinkChoice || null,
  });
  persist();
  dispatch();
}

// Добавляет в корзину позиции из снимка прошлого заказа («Повторить заказ»).
// Отбрасывает товары, которых больше нет в меню, и чистит устаревшие размеры.
// Возвращает число фактически добавленных позиций.
export function addStoredItems(storedItems) {
  const valid = (storedItems ?? [])
    .filter((item) => PRODUCTS.find((p) => p.id === item.id))
    .map((item) => sanitizeItem({ ...item }));
  if (!valid.length) return 0;
  items.push(...valid);
  persist();
  dispatch();
  return valid.length;
}

export function removeItem(index) {
  items.splice(index, 1);
  persist();
  dispatch();
}

export function updateQty(index, delta) {
  if (!items[index]) return;
  items[index].qty += delta;
  if (items[index].qty <= 0) {
    removeItem(index);
    return;
  }
  persist();
  dispatch();
}

export function getItems() {
  return syncedProducts();
}

export function getCount() {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function getSubtotal() {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function clearCart() {
  items = [];
  clearCartStorage();
  dispatch();
}
