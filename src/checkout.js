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

  const submitBtn = formEl.querySelector('[type="submit"]');

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(formEl)) return;
    const data = buildFormData(formEl);

    let orderCode = null;
    if (isApiEnabled()) {
      const originalLabel = submitBtn?.textContent;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando pedido...';
      }
      try {
        const result = await createOrder(buildOrderPayload(data));
        orderCode = result.order?.publicCode ?? null;
      } catch (err) {
        console.warn('Pedido não persistido, seguindo apenas pelo WhatsApp:', err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      }
    }

    const message = buildWhatsAppMessage(data, orderCode);
    sendToWhatsApp(message);
    resetForm();
    onSuccess();
  });
}

export function renderCheckoutSummary(containerEl) {
  const items = getItems();
  const subtotal = getSubtotal();
  const deliveryFee = subtotal >= 80 ? 0 : STORE.deliveryFee;
  const total = subtotal + deliveryFee;

  containerEl.innerHTML = `
    <div class="checkout-summary">
      <div class="checkout-summary__title">Resumo do pedido</div>
      ${items.map(i => {
        const customLines = [];
        if (i.removes?.length) customLines.push(...i.removes);
        if (i.extras?.length) customLines.push(...i.extras.map(e => `+${e}`));
        if (i.meatPoint) customLines.push(`Ponto: ${i.meatPoint}`);
        if (i.drinkChoice) customLines.push(`Bebida: ${i.drinkChoice}`);
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
        <span>Taxa de entrega</span>
        <span>${deliveryFee === 0 ? 'Grátis' : formatPrice(deliveryFee)}</span>
      </div>
      <div class="checkout-summary__total">
        <span>Total</span>
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
    { id: 'customerName', message: 'Informe seu nome' },
    { id: 'customerPhone', message: 'Informe seu WhatsApp' },
  ];

  const deliveryType = formEl.querySelector('[name="deliveryType"]:checked');
  if (!deliveryType) {
    showFieldError(formEl.querySelector('#deliveryTypeGroup'), 'Selecione entrega ou retirada');
    valid = false;
  } else if (deliveryType.value === 'delivery') {
    required.push({ id: 'address', message: 'Informe o endereço de entrega' });
  }

  const payment = formEl.querySelector('[name="payment"]:checked');
  if (!payment) {
    showFieldError(formEl.querySelector('#paymentGroup'), 'Selecione a forma de pagamento');
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
    items: items.map((i) => ({
      externalProductId: String(i.id),
      quantity: i.qty,
      customizations: {
        removes: i.removes ?? [],
        extras: i.extras ?? [],
        meatPoint: i.meatPoint ?? null,
        drinkChoice: i.drinkChoice ?? null,
      },
    })),
  };
}

function buildWhatsAppMessage(data, orderCode = null) {
  const items = getItems();
  const subtotal = getSubtotal();
  const deliveryFee = subtotal >= 80 ? 0 : STORE.deliveryFee;
  const total = subtotal + deliveryFee;

  const itemLines = items.map(i => {
    const customLines = [];
    if (i.removes?.length) customLines.push(...i.removes);
    if (i.extras?.length) customLines.push(...i.extras.map(e => `+${e}`));
    if (i.meatPoint) customLines.push(`Ponto: ${i.meatPoint}`);
    if (i.drinkChoice) customLines.push(`Bebida: ${i.drinkChoice}`);
    const customStr = customLines.length ? `\n    ↳ ${customLines.join(', ')}` : '';
    return `• ${i.qty}× ${i.name} — ${formatPrice(i.price * i.qty)}${customStr}`;
  }).join('\n');

  const deliveryLabel = data.deliveryType === 'delivery' ? '🚚 Delivery' : '🏃 Retirada no local';
  const addressLine = data.deliveryType === 'delivery' ? `📍 *Endereço:* ${data.address}\n` : '';
  const paymentLabels = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };
  const paymentLabel = paymentLabels[data.payment] ?? data.payment;
  const changeLine = data.payment === 'dinheiro' && data.change ? `💵 *Troco para:* R$ ${data.change}\n` : '';
  const notesLine = data.notes ? `\n📝 *Obs:* ${data.notes}` : '';
  const feeLine = deliveryFee === 0 ? 'Grátis 🎉' : formatPrice(deliveryFee);

  const lines = [
    `🔥 *${STORE.name} — Novo Pedido*`,
    orderCode ? `🧾 *Pedido:* ${orderCode}` : null,
    ``,
    `👤 *Cliente:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    ``,
    `📋 *Itens:*`,
    itemLines,
    ``,
    `---`,
    deliveryLabel,
    addressLine.trim() || null,
    ``,
    `💳 *Pagamento:* ${paymentLabel}`,
    changeLine.trim() || null,
    notesLine || null,
    ``,
    `---`,
    `🛒 *Subtotal:* ${formatPrice(subtotal)}`,
    `🚚 *Frete:* ${feeLine}`,
    `✅ *Total: ${formatPrice(total)}*`,
  ].filter(l => l !== null).join('\n');

  return lines;
}

function sendToWhatsApp(message) {
  const phone = STORE.whatsapp.replace(/\D/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}
