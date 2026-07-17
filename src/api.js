import { API_URL, RESTAURANT_SLUG } from './config.js';

export function isApiEnabled() {
  return Boolean(API_URL);
}

export async function createOrder(payload) {
  const url = `${API_URL}/api/public/restaurants/${RESTAURANT_SLUG}/orders`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Не удалось оформить заказ.');
    error.status = response.status;
    error.issues = data.issues;
    throw error;
  }
  return data;
}
