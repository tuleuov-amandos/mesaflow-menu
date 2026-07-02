export const ORDER_STATUSES = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELED'];

export const STATUS_LABELS = {
  NEW: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Finalizado',
  CANCELED: 'Cancelado',
};

const ALLOWED_TRANSITIONS = {
  NEW: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  CANCELED: [],
};

export function isValidStatus(status) {
  return ORDER_STATUSES.includes(status);
}

export function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from) {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
