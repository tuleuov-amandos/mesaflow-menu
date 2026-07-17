import { STORE, formatPrice } from './data.js';
import { getItems, getSubtotal, clearCart } from './cart.js';
import { createOrder, isApiEnabled } from './api.js';

export function initCheckoutForm(formEl, onSuccess) {
  const deliveryTypeInputs = formEl.querySelectorAll('[name="deliveryType"]');
  const addressGroup = formEl.querySelector('#addressGroup');
  const paymentInputs = formEl.querySelectorAll('[name="payment"]');
  const changeGroup = formEl.querySelector('#changeGroup');

  const syncConditionalGroups = () => {
    const isDelivery = formEl.querySelector('[name="deliveryType"]:checked')?.value === 'delivery';
    isDelivery ? addressGroup.removeAttribute('hidden') : addressGroup.setAttribute('hidden', '');
    const isCash = formEl.querySelector('[name="payment"]:checked')?.value === 'dinheiro';
    isCash ? changeGroup.removeAttribute('hidden') : changeGroup.setAttribute('hidden', '');
  };

  const resetForm = () => {
    formEl.reset();
    formEl.querySelectorAll('.form-error').forEach(el => el.remove());
    formEl.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    syncConditionalGroups();
  };

  deliveryTypeInputs.forEach(input => {
    input.addEventListener('change', syncConditionalGroups);
  });

  paymentInputs.forEach(input => {
    input.addEventListener('change', syncConditionalGroups);
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(formEl)) return;
    const data = buildFormData(formEl);

    // Открываем WhatsApp сразу, синхронно в рамках клика. Если сначала ждать ответа
    // API (который может «просыпаться» на бесплатном тарифе), браузер теряет «жест
    // пользователя» и блокирует открытие вкладки — страница выглядит зависшей.
    const message = buildWhatsAppMessage(data, null);
    sendToWhatsApp(message);

    // Сохраняем заказ в базе в фоне — «лучшее усилие». Даже если бэкенд недоступен
    // или отвечает медленно, оформление по WhatsApp уже прошло и не блокируется.
    if (isApiEnabled()) {
      createOrder(buildOrderPayload(data)).catch((err) => {
        console.warn('Заказ не сохранён, продолжаем только через WhatsApp:', err);
      });
    }

    resetForm();
    onSuccess(null);
  });
}

export function renderCheckoutSummary(containerEl) {
  const items = getItems();
  const subtotal = getSubtotal();
  const deliveryFee = subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  const total = subtotal + deliveryFee;

  containerEl.innerHTML = `
    <div class="checkout-summary">
      <div class="checkout-summary__title">Ваш заказ</div>
      ${items.map(i => {
        const customLines = [];
        if (i.removes?.length) customLines.push(...i.removes);
        if (i.extras?.length) customLines.push(...i.extras.map(e => `+${e}`));
        if (i.size) customLines.push(`Размер: ${i.size}`);
        if (i.drinkChoice) customLines.push(`Напиток: ${i.drinkChoice}`);
        return `
          <div class="checkout-summary__item">
            <span>
              ${i.qty}× ${i.name}
              ${customLines.length ? `<br><small style="color:var(--clr-text-muted);font-size:0.7rem">${customLines.join(' · ')}</small>` : ''}
            </span>
            <span>${formatPrice(i.price * i.qty)}</span>
          </div>
        `;
      }).join('')}
      <div class="checkout-summary__item">
        <span>Доставка</span>
        <span>${deliveryFee === 0 ? 'Бесплатно' : formatPrice(deliveryFee)}</span>
      </div>
      <div class="checkout-summary__total">
        <span>Итого</span>
        <span>${formatPrice(total)}</span>
      </div>
    </div>
  `;
}

function validate(formEl) {
  let valid = true;
  formEl.querySelectorAll('.form-error').forEach(el => el.remove());
  formEl.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

  const required = [
    { id: 'customerName', message: 'Укажите ваше имя' },
    { id: 'customerPhone', message: 'Укажите ваш WhatsApp' },
  ];

  const deliveryType = formEl.querySelector('[name="deliveryType"]:checked');
  if (!deliveryType) {
    showFieldError(formEl.querySelector('#deliveryTypeGroup'), 'Выберите доставку или самовывоз');
    valid = false;
  } else if (deliveryType.value === 'delivery') {
    required.push({ id: 'address', message: 'Укажите адрес доставки' });
  }

  const payment = formEl.querySelector('[name="payment"]:checked');
  if (!payment) {
    showFieldError(formEl.querySelector('#paymentGroup'), 'Выберите способ оплаты');
    valid = false;
  }

  required.forEach(({ id, message }) => {
    const el = formEl.querySelector(`#${id}`);
    if (!el || !el.value.trim()) {
      if (el) el.classList.add('error');
      showFieldError(el?.parentNode ?? formEl, message);
      valid = false;
    }
  });

  return valid;
}

function showFieldError(el, message) {
  const error = document.createElement('p');
  error.className = 'form-error';
  error.textContent = message;
  el?.appendChild(error);
}

function buildFormData(formEl) {
  const get = (id) => formEl.querySelector(`#${id}`)?.value?.trim() ?? '';
  return {
    name: get('customerName'),
    phone: get('customerPhone'),
    deliveryType: formEl.querySelector('[name="deliveryType"]:checked')?.value ?? 'retirada',
    address: get('address'),
    payment: formEl.querySelector('[name="payment"]:checked')?.value ?? '',
    change: get('change'),
    notes: get('notes'),
  };
}

function parseChangeToCents(value) {
  if (!value) return null;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const amount = parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function buildOrderPayload(data) {
  const items = getItems();
  const paymentMap = { pix: 'PIX', cartao: 'CARD', dinheiro: 'CASH' };
  const method = paymentMap[data.payment] ?? 'PIX';
  const isDelivery = data.deliveryType === 'delivery';

  return {
    customer: { name: data.name, phone: data.phone },
    fulfillment: isDelivery ? 'DELIVERY' : 'PICKUP',
    address: isDelivery ? { text: data.address } : undefined,
    payment: {
      method,
      changeForCents: method === 'CASH' ? parseChangeToCents(data.change) : null,
    },
    notes: data.notes || undefined,
    items: items.map((i) => {
      const customizations = {
        removes: i.removes ?? [],
        extras: i.extras ?? [],
        drinkChoice: i.drinkChoice ?? null,
      };
      if (i.size) customizations.size = i.size;
      return {
        externalProductId: String(i.id),
        quantity: i.qty,
        customizations,
      };
    }),
  };
}

function buildWhatsAppMessage(data, orderLabel = null) {
  const items = getItems();
  const subtotal = getSubtotal();
  const deliveryFee = subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  const total = subtotal + deliveryFee;

  const itemLines = items.map(i => {
    const customLines = [];
    if (i.removes?.length) customLines.push(...i.removes);
    if (i.extras?.length) customLines.push(...i.extras.map(e => `+${e}`));
    if (i.size) customLines.push(`Размер: ${i.size}`);
    if (i.drinkChoice) customLines.push(`Напиток: ${i.drinkChoice}`);
    const customStr = customLines.length ? `\n    ↳ ${customLines.join(', ')}` : '';
    return `• ${i.qty}× ${i.name} — ${formatPrice(i.price * i.qty)}${customStr}`;
  }).join('\n');

  const deliveryLabel = data.deliveryType === 'delivery' ? '🚚 Доставка' : '🏃 Самовывоз';
  const addressLine = data.deliveryType === 'delivery' ? `📍 *Адрес:* ${data.address}\n` : '';
  const paymentLabels = { pix: 'Kaspi', cartao: 'Карта', dinheiro: 'Наличные' };
  const paymentLabel = paymentLabels[data.payment] ?? data.payment;
  const changeLine = data.payment === 'dinheiro' && data.change ? `💵 *Сдача с:* ${data.change} ₸\n` : '';
  const notesLine = data.notes ? `\n📝 *Комментарий:* ${data.notes}` : '';
  const feeLine = deliveryFee === 0 ? 'Бесплатно 🎉' : formatPrice(deliveryFee);

  const lines = [
    `☕ *${STORE.name} — Новый заказ*`,
    orderLabel ? `🧾 *Заказ:* ${orderLabel}` : null,
    ``,
    `👤 *Клиент:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    ``,
    `📋 *Позиции:*`,
    itemLines,
    ``,
    `---`,
    deliveryLabel,
    addressLine.trim() || null,
    ``,
    `💳 *Оплата:* ${paymentLabel}`,
    changeLine.trim() || null,
    notesLine || null,
    ``,
    `---`,
    `🛒 *Сумма:* ${formatPrice(subtotal)}`,
    `🚚 *Доставка:* ${feeLine}`,
    `✅ *Итого: ${formatPrice(total)}*`,
  ].filter(l => l !== null).join('\n');

  return lines;
}

function sendToWhatsApp(message) {
  const phone = STORE.whatsapp.replace(/\D/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}
