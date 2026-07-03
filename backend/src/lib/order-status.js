export const ORDER_STATUSES = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'FINALIZED',
  'CANCELED',
];

export const STATUS_LABELS = {
  NEW: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  FINALIZED: 'Finalizado',
  CANCELED: 'Cancelado',
};

export function isValidStatus(status) {
  return ORDER_STATUSES.includes(status);
}

export function nextStatuses(from, fulfillmentType) {
  switch (from) {
    case 'NEW':
      return ['CONFIRMED', 'CANCELED'];
    case 'CONFIRMED':
      return ['PREPARING', 'CANCELED'];
    case 'PREPARING':
      return ['READY', 'CANCELED'];
    case 'READY':
      return fulfillmentType === 'DELIVERY' ? ['OUT_FOR_DELIVERY'] : ['FINALIZED'];
    case 'OUT_FOR_DELIVERY':
      return ['FINALIZED'];
    default:
      return [];
  }
}

export function canTransition(from, to, fulfillmentType) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  return nextStatuses(from, fulfillmentType).includes(to);
}
