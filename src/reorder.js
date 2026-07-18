import { getLastOrder } from './storage.js';
import { addStoredItems } from './cart.js';
import { PRODUCTS, formatPrice } from './data.js';

// Карточка «Повторить прошлый заказ» для постоянных клиентов. Читает снимок
// последнего заказа из localStorage и в один тап возвращает те же позиции в
// корзину. Показывается только если снимок есть и хотя бы одна позиция ещё
// присутствует в текущем меню.
export function initReorder(containerEl, { onReorder } = {}) {
  if (!containerEl) return;

  const last = getLastOrder();
  const items = (last?.items ?? []).filter((i) => PRODUCTS.find((p) => p.id === i.id));
  if (!items.length) {
    containerEl.setAttribute('hidden', '');
    return;
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const summary = items.map((i) => `${i.qty}× ${i.name}`).join(', ');

  containerEl.innerHTML = `
    <div class="reorder-card__body">
      <span class="reorder-card__icon" aria-hidden="true">🔁</span>
      <div class="reorder-card__text">
        <div class="reorder-card__title">Повторить прошлый заказ</div>
        <div class="reorder-card__summary" title="${summary}">${summary}</div>
      </div>
    </div>
    <button class="reorder-card__btn" type="button" data-reorder>
      Повторить · ${formatPrice(total)}
    </button>
  `;
  containerEl.removeAttribute('hidden');

  containerEl.querySelector('[data-reorder]')?.addEventListener('click', () => {
    const added = addStoredItems(items);
    if (added) onReorder?.(added);
  });
}
