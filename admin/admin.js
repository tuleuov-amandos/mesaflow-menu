import { API_URL } from '../src/config.js';

const TOKEN_KEY = 'mesaflow_admin_token';
const POLL_MS = 30000;

const STATUS_LABELS = {
  NEW: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Finalizado',
  CANCELED: 'Cancelado',
};

const FULFILLMENT_LABELS = { DELIVERY: 'Entrega', PICKUP: 'Retirada' };
const PAYMENT_LABELS = { PIX: 'Pix', CARD: 'Cartão', CASH: 'Dinheiro' };

const els = {
  loginView: document.getElementById('loginView'),
  panelView: document.getElementById('panelView'),
  loginForm: document.getElementById('loginForm'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),
  search: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  ordersList: document.getElementById('ordersList'),
  ordersEmpty: document.getElementById('ordersEmpty'),
  cardNovos: document.getElementById('cardNovos'),
  cardPreparo: document.getElementById('cardPreparo'),
  cardFinalizados: document.getElementById('cardFinalizados'),
  lastUpdate: document.getElementById('lastUpdate'),
  modal: document.getElementById('detailModal'),
  detailContent: document.getElementById('detailContent'),
};

let pollTimer = null;
let currentDetailId = null;

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function money(cents) {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')}`;
}

function formatDateTime(value) {
  const d = new Date(value);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function whatsappLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição.');
  }
  return data;
}

function showPanel() {
  els.loginView.hidden = true;
  els.panelView.hidden = false;
}

function showLogin() {
  els.panelView.hidden = true;
  els.loginView.hidden = false;
  els.password.value = '';
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (getToken() && document.visibilityState === 'visible') {
      loadOrders();
      if (currentDetailId) loadDetail(currentDetailId, true);
    }
  }, POLL_MS);
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function logout() {
  clearToken();
  stopPolling();
  closeModal();
  showLogin();
}

async function login(password) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao entrar.');
  return data.token;
}

function renderSummary(summary) {
  els.cardNovos.textContent = summary.novos ?? 0;
  els.cardPreparo.textContent = summary.emPreparo ?? 0;
  els.cardFinalizados.textContent = summary.finalizados ?? 0;
}

function statusBadge(status) {
  const badge = el('span', `badge badge--${status.toLowerCase()}`, STATUS_LABELS[status] ?? status);
  return badge;
}

function renderOrders(orders) {
  els.ordersList.textContent = '';
  els.ordersEmpty.hidden = orders.length > 0;

  for (const order of orders) {
    const li = el('li', 'order');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');

    const head = el('div', 'order__head');
    head.appendChild(el('span', 'order__code', order.publicCode));
    head.appendChild(statusBadge(order.status));
    li.appendChild(head);

    const meta = el('div', 'order__meta');
    meta.appendChild(el('span', 'order__customer', order.customerName || 'Sem nome'));
    meta.appendChild(el('span', 'order__phone', order.customerPhone || ''));
    li.appendChild(meta);

    const foot = el('div', 'order__foot');
    const tags = el('div', 'order__tags');
    tags.appendChild(el('span', 'tag', FULFILLMENT_LABELS[order.fulfillmentType] ?? order.fulfillmentType));
    tags.appendChild(el('span', 'tag', PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod));
    foot.appendChild(tags);
    foot.appendChild(el('span', 'order__total', money(order.totalCents)));
    li.appendChild(foot);

    li.appendChild(el('time', 'order__time', formatDateTime(order.createdAt)));

    const open = () => loadDetail(order.id);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    els.ordersList.appendChild(li);
  }
}

async function loadOrders() {
  try {
    const params = new URLSearchParams();
    const status = els.statusFilter.value;
    const q = els.search.value.trim();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const data = await api(`/orders${params.toString() ? `?${params}` : ''}`);
    renderSummary(data.summary);
    renderOrders(data.orders);
    els.lastUpdate.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    if (err.message !== 'unauthorized') console.warn(err.message);
  }
}

function renderCustomizations(container, customizations) {
  if (!customizations || typeof customizations !== 'object') return;
  const parts = [];
  if (Array.isArray(customizations.removes) && customizations.removes.length) {
    parts.push(`Sem: ${customizations.removes.join(', ')}`);
  }
  if (Array.isArray(customizations.extras) && customizations.extras.length) {
    parts.push(`Adicionais: ${customizations.extras.join(', ')}`);
  }
  if (customizations.meatPoint) parts.push(`Ponto: ${customizations.meatPoint}`);
  if (customizations.drinkChoice) parts.push(`Bebida: ${customizations.drinkChoice}`);
  for (const line of parts) {
    container.appendChild(el('span', 'detail__custom', line));
  }
}

function renderDetail(order) {
  const c = els.detailContent;
  c.textContent = '';

  const header = el('div', 'detail__header');
  const code = el('h2', 'detail__code', order.publicCode);
  code.id = 'detailCode';
  header.appendChild(code);
  header.appendChild(statusBadge(order.status));
  c.appendChild(header);

  c.appendChild(el('p', 'detail__when', formatDateTime(order.createdAt)));

  const info = el('div', 'detail__info');
  info.appendChild(el('span', null, order.customerName || 'Sem nome'));
  info.appendChild(el('span', null, order.customerPhone || 'Sem telefone'));
  info.appendChild(el('span', null, `${FULFILLMENT_LABELS[order.fulfillmentType]} · ${PAYMENT_LABELS[order.paymentMethod]}`));
  if (order.address) info.appendChild(el('span', null, order.address));
  if (order.changeForCents) info.appendChild(el('span', null, `Troco para ${money(order.changeForCents)}`));
  if (order.notes) info.appendChild(el('span', 'detail__notes', `Obs.: ${order.notes}`));
  c.appendChild(info);

  const wa = document.createElement('a');
  wa.className = 'btn btn--wa';
  wa.href = whatsappLink(order.customerPhone);
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = 'Abrir no WhatsApp';
  c.appendChild(wa);

  const itemsWrap = el('div', 'detail__items');
  itemsWrap.appendChild(el('h3', 'detail__section', 'Itens'));
  for (const item of order.items) {
    const row = el('div', 'detail__item');
    row.appendChild(el('span', 'detail__item-qty', `${item.quantity}×`));
    const body = el('div', 'detail__item-body');
    body.appendChild(el('span', 'detail__item-name', item.productName));
    renderCustomizations(body, item.customizations);
    row.appendChild(body);
    row.appendChild(el('span', 'detail__item-price', money(item.lineTotalCents)));
    itemsWrap.appendChild(row);
  }
  c.appendChild(itemsWrap);

  const totals = el('div', 'detail__totals');
  totals.appendChild(totalRow('Subtotal', money(order.subtotalCents)));
  totals.appendChild(totalRow('Entrega', order.deliveryFeeCents ? money(order.deliveryFeeCents) : 'Grátis'));
  const totalLine = totalRow('Total', money(order.totalCents));
  totalLine.classList.add('detail__total-final');
  totals.appendChild(totalLine);
  c.appendChild(totals);

  if (order.nextStatuses && order.nextStatuses.length) {
    const actions = el('div', 'detail__actions');
    actions.appendChild(el('h3', 'detail__section', 'Atualizar status'));
    const buttons = el('div', 'detail__buttons');
    for (const next of order.nextStatuses) {
      const btn = el('button', 'btn btn--status', STATUS_LABELS[next] ?? next);
      btn.type = 'button';
      btn.addEventListener('click', () => updateStatus(order.id, next));
      buttons.appendChild(btn);
    }
    actions.appendChild(buttons);
    c.appendChild(actions);
  }

  const timeline = el('div', 'detail__timeline');
  timeline.appendChild(el('h3', 'detail__section', 'Histórico'));
  const tl = el('ol', 'timeline');
  for (const event of order.history) {
    const item = el('li', 'timeline__item');
    item.appendChild(el('span', 'timeline__dot'));
    const txt = el('div', 'timeline__body');
    txt.appendChild(el('span', 'timeline__status', STATUS_LABELS[event.status] ?? event.status));
    txt.appendChild(el('time', 'timeline__time', formatDateTime(event.createdAt)));
    item.appendChild(txt);
    tl.appendChild(item);
  }
  timeline.appendChild(tl);
  c.appendChild(timeline);
}

function totalRow(label, value) {
  const row = el('div', 'detail__total-row');
  row.appendChild(el('span', null, label));
  row.appendChild(el('span', null, value));
  return row;
}

async function loadDetail(id, silent = false) {
  try {
    const data = await api(`/orders/${encodeURIComponent(id)}`);
    currentDetailId = id;
    renderDetail(data.order);
    if (!silent) openModal();
  } catch (err) {
    if (err.message !== 'unauthorized' && !silent) alert(err.message);
  }
}

async function updateStatus(id, status) {
  try {
    await api(`/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadDetail(id, true);
    await loadOrders();
  } catch (err) {
    if (err.message !== 'unauthorized') alert(err.message);
  }
}

function openModal() {
  els.modal.hidden = false;
}
function closeModal() {
  els.modal.hidden = true;
  currentDetailId = null;
}

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.hidden = true;
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = 'Entrando...';
  try {
    const token = await login(els.password.value);
    setToken(token);
    showPanel();
    await loadOrders();
    startPolling();
  } catch (err) {
    els.loginError.textContent = err.message;
    els.loginError.hidden = false;
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Entrar';
  }
});

els.logoutBtn.addEventListener('click', logout);
els.search.addEventListener('input', debounce(loadOrders, 300));
els.statusFilter.addEventListener('change', loadOrders);
els.modal.addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-close')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modal.hidden) closeModal();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && getToken()) loadOrders();
});

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function init() {
  closeModal();
  els.loginError.textContent = '';
  els.loginError.hidden = true;
  if (getToken()) {
    showPanel();
    loadOrders();
    startPolling();
  } else {
    showLogin();
  }
}

init();
