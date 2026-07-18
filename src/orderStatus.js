import { getOrderStatus, isApiEnabled } from './api.js';
import { getActiveOrder, clearActiveOrder } from './storage.js';

// Живое отслеживание заказа для клиента: карточка со степпером «Принят →
// Готовится → Готов → Выдан» и коротким опросом статуса, пока страница открыта.
// Так клиент видит «Готов, забирайте» и не толпится у стойки.

const PICKUP_FLOW = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'FINALIZED'];
const DELIVERY_FLOW = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'FINALIZED'];

// Короткие подписи шагов степпера.
const STEP_LABELS = {
  NEW: 'Принят',
  CONFIRMED: 'Принят',
  PREPARING: 'Готовится',
  READY: 'Готов',
  OUT_FOR_DELIVERY: 'В пути',
  FINALIZED: 'Выдан',
};

// Крупный заголовок текущего статуса (обращён к клиенту).
const HEADLINES = {
  NEW: 'Заказ принят',
  CONFIRMED: 'Заказ подтверждён',
  PREPARING: 'Готовим ваш заказ',
  READY: 'Готов — можно забирать ☕',
  OUT_FOR_DELIVERY: 'Курьер в пути к вам 🛵',
  FINALIZED: 'Заказ выдан. Спасибо! 🙌',
  CANCELED: 'Заказ отменён',
};

const TERMINAL = new Set(['FINALIZED', 'CANCELED']);
const POLL_MS = 25000;
const STALE_MS = 12 * 60 * 60 * 1000; // не отслеживаем заказы старше 12 часов

let containerRef = null;
let pollTimer = null;

export function initOrderStatus(containerEl) {
  containerRef = containerEl;
  containerRef?.addEventListener('click', onCardClick);
  refresh();
}

// Вызывается после того, как только что оформленный заказ сохранился в базе.
export function refreshOrderStatus() {
  refresh();
}

function onCardClick(e) {
  if (e.target.closest('[data-refresh]')) { refresh(); return; }
  if (e.target.closest('[data-dismiss]')) {
    clearActiveOrder();
    stopPolling();
    hide();
  }
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

function schedulePoll() {
  stopPolling();
  pollTimer = setTimeout(refresh, POLL_MS);
}

function hide() {
  if (!containerRef) return;
  containerRef.setAttribute('hidden', '');
  containerRef.innerHTML = '';
}

async function refresh() {
  stopPolling();
  if (!containerRef) return;

  const active = getActiveOrder();
  if (!active?.publicCode || !isApiEnabled()) { hide(); return; }
  if (active.at && Date.now() - active.at > STALE_MS) { clearActiveOrder(); hide(); return; }

  let order;
  try {
    order = await getOrderStatus(active.publicCode);
  } catch (err) {
    // 404 — заказа нет (например, база очищена): перестаём отслеживать.
    if (err?.status === 404) { clearActiveOrder(); hide(); return; }
    // Сеть/бэкенд «спит»: показываем мягкое состояние и пробуем ещё раз.
    renderUnavailable(active);
    schedulePoll();
    return;
  }

  render(order);

  if (TERMINAL.has(order.status)) {
    // Заказ завершён: показываем финальное состояние в этой сессии, но больше
    // не храним — после перезагрузки карточка не вернётся.
    clearActiveOrder();
  } else {
    schedulePoll();
  }
}

function show(html) {
  if (!containerRef) return;
  containerRef.innerHTML = html;
  containerRef.removeAttribute('hidden');
}

function renderUnavailable(active) {
  show(`
    <div class="track-card__top">
      <div class="track-card__head">
        <div class="track-card__order">Заказ #${active.orderNumber ?? ''}</div>
        <div class="track-card__status">Обновляем статус…</div>
      </div>
      <button class="track-card__refresh" type="button" data-refresh aria-label="Обновить статус">⟳</button>
    </div>
  `);
}

function render(order) {
  const isTerminalCancel = order.status === 'CANCELED';
  const headline = HEADLINES[order.status] ?? order.statusLabel ?? order.status;

  const etaBadge =
    order.etaMinutes && ['CONFIRMED', 'PREPARING'].includes(order.status)
      ? `<span class="track-card__eta">≈ ${order.etaMinutes} мин</span>`
      : '';

  const dismissBtn = TERMINAL.has(order.status)
    ? `<button class="track-card__refresh" type="button" data-dismiss aria-label="Скрыть">✕</button>`
    : `<button class="track-card__refresh" type="button" data-refresh aria-label="Обновить статус">⟳</button>`;

  const steps = isTerminalCancel ? '' : renderSteps(order);

  show(`
    <div class="track-card__top">
      <div class="track-card__head">
        <div class="track-card__order">Заказ #${order.orderNumber}</div>
        <div class="track-card__status track-card__status--${statusTone(order.status)}">
          ${headline} ${etaBadge}
        </div>
      </div>
      ${dismissBtn}
    </div>
    ${steps}
  `);
}

function renderSteps(order) {
  const flow = order.fulfillmentType === 'DELIVERY' ? DELIVERY_FLOW : PICKUP_FLOW;
  const idx = flow.indexOf(order.status);
  const items = flow
    .map((s, i) => {
      const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
      return `
        <li class="ostep ostep--${state}">
          <span class="ostep__dot" aria-hidden="true"></span>
          <span class="ostep__label">${STEP_LABELS[s]}</span>
        </li>`;
    })
    .join('');
  return `<ol class="track-steps" aria-label="Прогресс заказа">${items}</ol>`;
}

function statusTone(status) {
  if (status === 'READY') return 'ready';
  if (status === 'CANCELED') return 'canceled';
  if (status === 'FINALIZED') return 'done';
  return 'active';
}
