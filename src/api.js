import { API_URL, RESTAURANT_SLUG } from './config.js';

// Ограничение времени запроса к API. Бэкенд на бесплатном тарифе может «просыпаться»
// после простоя; без таймаута запрос завис бы надолго. Заказ по WhatsApp от этого
// не зависит — сохранение в базе всегда «лучшее усилие».
const REQUEST_TIMEOUT_MS = 8000;

export function isApiEnabled() {
  return Boolean(API_URL);
}

export async function createOrder(payload) {
  const url = `${API_URL}/api/public/restaurants/${RESTAURANT_SLUG}/orders`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Не удалось оформить заказ.');
    error.status = response.status;
    error.issues = data.issues;
    throw error;
  }
  return data;
}

// Публичный статус заказа по техническому коду (MF-XXXXXX). Возвращает только
// статус/ETA/историю без персональных данных. Бросает ошибку с .status для
// отличения «заказ не найден» (404) от сетевых сбоев.
export async function getOrderStatus(publicCode) {
  const url = `${API_URL}/api/public/restaurants/${RESTAURANT_SLUG}/orders/${encodeURIComponent(publicCode)}/status`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Не удалось получить статус заказа.');
    error.status = response.status;
    throw error;
  }
  return data.order;
}
