import { API_URL } from '../src/config.js';

const TOKEN_KEY = 'mesaflow_admin_token';
const POLL_MS = 30000;
const RESTAURANT_NAME = 'Beco da Chapa';
const NEW_ATTENTION_MINUTES = 10;
const DEFAULT_ETA_MINUTES = 35;

const STATUS_LABELS = {
  NEW: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  FINALIZED: 'Finalizado',
  CANCELED: 'Cancelado',
};

const ACTION_LABELS = {
  CONFIRMED: 'Confirmar pedido',
  PREPARING: 'Iniciar preparo',
  READY: 'Marcar como pronto',
  OUT_FOR_DELIVERY: 'Sair para entrega',
  FINALIZED: 'Finalizar pedido',
  CANCELED: 'Cancelar pedido',
};

const ACTIVE_STATUSES = new Set(['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);
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
  newOrdersAlert: document.getElementById('newOrdersAlert'),
  modal: document.getElementById('detailModal'),
  detailContent: document.getElementById('detailContent'),
};

const novosCard = els.cardNovos.closest('.summary__card');

let pollTimer = null;
let currentDetailId = null;
let knownNewIds = new Set();
let firstLoad = true;
let alertActive = false;

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

function minutesSince(value) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 60000);
}

function waitingLabel(mins) {
  if (mins < 1) return 'agora mesmo';
  if (mins === 1) return 'há 1 min';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `há ${h}h${m ? ` ${m}min` : ''}`;
}

function whatsappBase(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function whatsappWithMessage(phone, message) {
  return `${whatsappBase(phone)}?text=${encodeURIComponent(message)}`;
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
  knownNewIds = new Set();
  firstLoad = true;
  alertActive = false;
  updateAlert();
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
  return el('span', `badge badge--${status.toLowerCase()}`, STATUS_LABELS[status] ?? status);
}

function updateAlert() {
  els.newOrdersAlert.hidden = !alertActive;
  if (novosCard) novosCard.classList.toggle('summary__card--alert', alertActive);
}

function trackNewArrivals(orders) {
  const currentNew = new Set(orders.filter((o) => o.status === 'NEW').map((o) => o.id));
  if (!firstLoad) {
    for (const id of currentNew) {
      if (!knownNewIds.has(id)) {
        alertActive = true;
        break;
      }
    }
  }
  if (currentNew.size === 0) alertActive = false;
  knownNewIds = currentNew;
  firstLoad = false;
  updateAlert();
}

function renderOrders(orders) {
  els.ordersList.textContent = '';
  els.ordersEmpty.hidden = orders.length > 0;

  for (const order of orders) {
    const li = el('li', 'order');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');

    const isNew = order.status === 'NEW';
    const waited = minutesSince(order.createdAt);
    if (isNew && waited >= NEW_ATTENTION_MINUTES) li.classList.add('order--attention');

    const head = el('div', 'order__head');
    head.appendChild(el('span', 'order__code', `#${order.orderNumber}`));
    head.appendChild(statusBadge(order.status));
    li.appendChild(head);

    const meta = el('div', 'order__meta');
    meta.appendChild(el('span', 'order__customer', order.customerName || 'Sem nome'));
    meta.appendChild(el('span', 'order__phone', order.customerPhone || ''));
    li.appendChild(meta);

    if (isNew) {
      const waitCls = waited >= NEW_ATTENTION_MINUTES ? 'order__waiting order__waiting--attention' : 'order__waiting';
      li.appendChild(el('span', waitCls, `Aguardando confirmação ${waitingLabel(waited)}`));
    }

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
    trackNewArrivals(data.orders);
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

function lastCancelReason(order) {
  const ev = [...(order.history || [])].reverse().find((h) => h.status === 'CANCELED' && h.note);
  return ev ? ev.note : null;
}

function generateStatusMessage(order, status) {
  const name = order.customerName || 'cliente';
  const code = `#${order.orderNumber}`;
  const isDelivery = order.fulfillmentType === 'DELIVERY';
  const eta = order.etaMinutes;
  switch (status) {
    case 'CONFIRMED':
      return `Olá, ${name}! Seu pedido ${code} no ${RESTAURANT_NAME} foi confirmado.${eta ? ` Previsão de preparo: ${eta} minutos.` : ''}`;
    case 'PREPARING':
      return `Olá, ${name}! Seu pedido ${code} já está em preparo no ${RESTAURANT_NAME}.`;
    case 'READY':
      return isDelivery
        ? `Olá, ${name}! Seu pedido ${code} está pronto e aguardando a saída para entrega.`
        : `Olá, ${name}! Seu pedido ${code} está pronto para retirada no ${RESTAURANT_NAME}.`;
    case 'OUT_FOR_DELIVERY':
      return `Olá, ${name}! Seu pedido ${code} saiu para entrega e está a caminho.`;
    case 'FINALIZED':
      return `Olá, ${name}! Obrigado por pedir no ${RESTAURANT_NAME}. Esperamos você novamente em breve!`;
    case 'CANCELED': {
      const reason = lastCancelReason(order);
      return `Olá, ${name}! Infelizmente seu pedido ${code} foi cancelado.${reason ? ` Motivo: ${reason}.` : ''}`;
    }
    default:
      return '';
  }
}

async function copyMessage(message, btn) {
  const done = () => {
    btn.textContent = 'Copiado';
    setTimeout(() => { btn.textContent = 'Copiar mensagem'; }, 1500);
  };
  try {
    await navigator.clipboard.writeText(message);
    done();
  } catch {
    const ta = document.createElement('textarea');
    ta.value = message;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    done();
  }
}

function buildCommunication(order) {
  const wrap = el('div', 'comms');
  wrap.appendChild(el('h3', 'detail__section', 'Mensagem para o cliente'));

  if (order.status === 'NEW') {
    wrap.appendChild(el('p', 'comms__hint', 'Confirme o pedido para preparar uma mensagem ao cliente.'));
    return wrap;
  }

  const message = generateStatusMessage(order, order.status);
  if (!message) {
    wrap.appendChild(el('p', 'comms__hint', 'Nenhuma mensagem preparada para este status.'));
    return wrap;
  }

  wrap.appendChild(el('p', 'comms__preview', message));

  const actions = el('div', 'comms__actions');
  const copyBtn = el('button', 'btn btn--ghost', 'Copiar mensagem');
  copyBtn.type = 'button';
  copyBtn.addEventListener('click', () => copyMessage(message, copyBtn));

  const waLink = document.createElement('a');
  waLink.className = 'btn btn--wa';
  waLink.href = whatsappWithMessage(order.customerPhone, message);
  waLink.target = '_blank';
  waLink.rel = 'noopener';
  waLink.textContent = 'Abrir no WhatsApp';

  actions.append(copyBtn, waLink);
  wrap.appendChild(actions);
  return wrap;
}

let toastTimer = null;
function showToast(text) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.className = 'admin-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('admin-toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('admin-toast--visible'), 2600);
}

function renderActions(order, host) {
  host.textContent = '';
  const next = order.nextStatuses || [];
  if (!next.length) {
    host.appendChild(el('p', 'detail__terminal', 'Pedido encerrado — nenhuma ação disponível.'));
    return;
  }
  host.appendChild(el('h3', 'detail__section', 'Ações do pedido'));
  const wrap = el('div', 'detail__buttons');
  for (const st of next) {
    const isCancel = st === 'CANCELED';
    const btn = el('button', `btn ${isCancel ? 'btn--danger' : 'btn--action'}`, ACTION_LABELS[st] ?? st);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (st === 'CONFIRMED') renderEtaForm(order, host);
      else if (st === 'CANCELED') renderCancelForm(order, host);
      else applyStatus(order, st);
    });
    wrap.appendChild(btn);
  }
  host.appendChild(wrap);
}

function renderEtaForm(order, host) {
  host.textContent = '';
  host.appendChild(el('h3', 'detail__section', 'Confirmar pedido'));
  const form = el('div', 'action-form');

  const label = el('label', 'action-form__label', 'Previsão de preparo (minutos)');
  label.setAttribute('for', 'etaInput');
  const input = document.createElement('input');
  input.type = 'number';
  input.id = 'etaInput';
  input.className = 'action-form__input';
  input.min = '5';
  input.max = '180';
  input.step = '1';
  input.value = String(DEFAULT_ETA_MINUTES);

  const err = el('p', 'action-form__error');
  err.hidden = true;

  const actions = el('div', 'action-form__actions');
  const confirm = el('button', 'btn btn--primary', 'Confirmar');
  confirm.type = 'button';
  const back = el('button', 'btn btn--ghost', 'Voltar');
  back.type = 'button';

  confirm.addEventListener('click', () => {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 5 || value > 180) {
      err.textContent = 'Informe um valor inteiro entre 5 e 180 minutos.';
      err.hidden = false;
      return;
    }
    applyStatus(order, 'CONFIRMED', { etaMinutes: value });
  });
  back.addEventListener('click', () => renderActions(order, host));

  actions.append(confirm, back);
  form.append(label, input, err, actions);
  host.appendChild(form);
  input.focus();
}

function renderCancelForm(order, host) {
  host.textContent = '';
  host.appendChild(el('h3', 'detail__section', 'Cancelar pedido'));
  const form = el('div', 'action-form');

  const label = el('label', 'action-form__label', 'Motivo do cancelamento');
  label.setAttribute('for', 'cancelReason');
  const ta = document.createElement('textarea');
  ta.id = 'cancelReason';
  ta.className = 'action-form__input';
  ta.rows = 2;
  ta.maxLength = 300;

  const err = el('p', 'action-form__error');
  err.hidden = true;

  const actions = el('div', 'action-form__actions');
  const confirm = el('button', 'btn btn--danger', 'Confirmar cancelamento');
  confirm.type = 'button';
  const back = el('button', 'btn btn--ghost', 'Voltar');
  back.type = 'button';

  confirm.addEventListener('click', () => {
    const reason = ta.value.trim();
    if (!reason) {
      err.textContent = 'Informe o motivo do cancelamento.';
      err.hidden = false;
      return;
    }
    applyStatus(order, 'CANCELED', { note: reason });
  });
  back.addEventListener('click', () => renderActions(order, host));

  actions.append(confirm, back);
  form.append(label, ta, err, actions);
  host.appendChild(form);
  ta.focus();
}

function renderDetail(order) {
  const c = els.detailContent;
  c.textContent = '';

  const header = el('div', 'detail__header');
  const code = el('h2', 'detail__code', `Pedido #${order.orderNumber}`);
  code.id = 'detailCode';
  header.appendChild(code);
  header.appendChild(statusBadge(order.status));
  c.appendChild(header);
  c.appendChild(el('p', 'detail__pubcode', `Ref. ${order.publicCode}`));

  c.appendChild(el('p', 'detail__when', formatDateTime(order.createdAt)));

  const info = el('div', 'detail__info');
  info.appendChild(el('span', null, order.customerName || 'Sem nome'));
  info.appendChild(el('span', null, order.customerPhone || 'Sem telefone'));
  info.appendChild(el('span', null, `${FULFILLMENT_LABELS[order.fulfillmentType]} · ${PAYMENT_LABELS[order.paymentMethod]}`));
  if (order.address) info.appendChild(el('span', null, order.address));
  if (order.changeForCents) info.appendChild(el('span', null, `Troco para ${money(order.changeForCents)}`));
  if (order.etaMinutes && ACTIVE_STATUSES.has(order.status)) {
    info.appendChild(el('span', 'detail__eta', `Previsão de preparo: ${order.etaMinutes} min`));
  }
  if (order.status === 'NEW') {
    info.appendChild(el('span', 'detail__waiting', `Aguardando confirmação ${waitingLabel(minutesSince(order.createdAt))}`));
  }
  if (order.notes) info.appendChild(el('span', 'detail__notes', `Obs.: ${order.notes}`));
  c.appendChild(info);

  const wa = document.createElement('a');
  wa.className = 'btn btn--wa';
  wa.href = whatsappBase(order.customerPhone);
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = 'Abrir conversa no WhatsApp';
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

  const actionsHost = el('div', 'detail__actions');
  renderActions(order, actionsHost);
  c.appendChild(actionsHost);

  c.appendChild(buildCommunication(order));

  const timeline = el('div', 'detail__timeline');
  timeline.appendChild(el('h3', 'detail__section', 'Histórico'));
  const tl = el('ol', 'timeline');
  for (const event of order.history) {
    const item = el('li', 'timeline__item');
    item.appendChild(el('span', 'timeline__dot'));
    const txt = el('div', 'timeline__body');
    const line = el('div', 'timeline__line');
    line.appendChild(el('span', 'timeline__status', STATUS_LABELS[event.status] ?? event.status));
    line.appendChild(el('time', 'timeline__time', formatDateTime(event.createdAt)));
    txt.appendChild(line);
    if (event.etaMinutes) txt.appendChild(el('span', 'timeline__note', `Previsão: ${event.etaMinutes} min`));
    if (event.note) txt.appendChild(el('span', 'timeline__note', `Motivo: ${event.note}`));
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

async function fetchDetail(id) {
  const data = await api(`/orders/${encodeURIComponent(id)}`);
  return data.order;
}

async function loadDetail(id, silent = false) {
  try {
    const order = await fetchDetail(id);
    currentDetailId = id;
    renderDetail(order);
    if (!silent) openModal();
  } catch (err) {
    if (err.message !== 'unauthorized' && !silent) alert(err.message);
  }
}

async function applyStatus(order, status, extra = {}) {
  try {
    await api(`/orders/${encodeURIComponent(order.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extra }),
    });
    const fresh = await fetchDetail(order.id);
    currentDetailId = order.id;
    renderDetail(fresh);
    showToast('Status atualizado');
    const commsSection = els.detailContent.querySelector('.comms');
    if (commsSection) commsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  updateAlert();
  if (getToken()) {
    showPanel();
    loadOrders();
    startPolling();
  } else {
    showLogin();
  }
}

init();
