import { getCart, saveCart, clearCartStorage } from './storage.js';
import { PRODUCTS } from './data.js';

let items = getCart();

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
    meatPoint: result.meatPoint || null,
    drinkChoice: result.drinkChoice || null,
  });
  persist();
  dispatch();
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
