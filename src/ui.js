import { CATEGORY_META, REVIEWS, PRODUCTS, STORE, formatPrice } from './data.js';
import { getFavorites, saveFavorites } from './storage.js';
import { SITE_URL } from './config.js';

let favorites = getFavorites();

// Склонение слова «товар» по числу (1 товар, 2 товара, 5 товаров)
function pluralizeItems(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'товар';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара';
  return 'товаров';
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function renderSkeletons(gridEl, count = 6) {
  gridEl.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-block skeleton-image"></div>
      <div class="skeleton-body">
        <div class="skeleton-block" style="width:65%;height:18px;margin-bottom:8px;border-radius:6px"></div>
        <div class="skeleton-block" style="width:100%;height:11px;margin-bottom:5px;border-radius:4px"></div>
        <div class="skeleton-block" style="width:80%;height:11px;margin-bottom:18px;border-radius:4px"></div>
        <div class="skeleton-block" style="width:50px;height:11px;margin-bottom:18px;border-radius:4px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="skeleton-block" style="width:80px;height:26px;border-radius:6px"></div>
          <div class="skeleton-block" style="width:38px;height:38px;border-radius:10px"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Product card ────────────────────────────────────────────────────────────

export function renderProductCard(product) {
  const meta = CATEGORY_META[product.category] || { emoji: '🍽️', gradient: 'linear-gradient(135deg, #111, #222)' };
  const isFav = favorites.has(product.id);
  const badgeHTML = product.badge
    ? `<span class="badge badge--${product.badgeType}">${product.badge}</span>`
    : '';
  const hasOptions = !!(product.customizations || product.drinkOptions);

  return `
    <article class="product-card${product.available ? '' : ' product-card--unavailable'}" data-id="${product.id}">
      <div class="product-card__image" style="background: ${meta.gradient}">
        <img
          src="${product.image}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.style.opacity='0'"
        >
        ${badgeHTML ? `<div class="product-card__badge">${badgeHTML}</div>` : ''}
        <button
          class="product-card__favorite${isFav ? ' active' : ''}"
          data-fav="${product.id}"
          aria-label="${isFav ? 'Убрать из избранного' : 'Добавить в избранное'}"
        >${isFav ? '❤️' : '🤍'}</button>
        <button
          class="product-card__add${hasOptions ? ' product-card__add--options' : ''}"
          data-add="${product.id}"
          aria-label="Добавить ${product.name} в корзину"
        >${hasOptions ? '🔧' : '+'}</button>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${product.name}</h3>
        <span class="product-card__price">${hasOptions ? '<span class="product-card__price-from">от</span> ' : ''}${formatPrice(product.price)}</span>
      </div>
    </article>
  `;
}

export function renderFeaturedCard(product) {
  const meta = CATEGORY_META[product.category] || { emoji: '🍽️', gradient: 'linear-gradient(135deg, #111, #222)' };
  return `
    <div class="featured-card" data-id="${product.id}" role="listitem" tabindex="0">
      <div class="featured-card__image" style="background: ${meta.gradient}">
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.opacity='0'">
      </div>
      <div class="featured-card__body">
        <div class="featured-card__name">${product.name}</div>
        <div class="featured-card__price">${formatPrice(product.price)}</div>
      </div>
    </div>
  `;
}

// ─── Products grid ───────────────────────────────────────────────────────────

export function renderProductsGrid(gridEl, products) {
  gridEl.innerHTML = products.map(renderProductCard).join('');
  gridEl.querySelectorAll('.product-card').forEach(card => {
    card.style.animationDelay = `${Math.random() * 80}ms`;
    card.classList.add('card-enter');
  });
}

export function renderFeatured(containerEl, products) {
  containerEl.innerHTML = products.map(renderFeaturedCard).join('');
}

// ─── Category chips ──────────────────────────────────────────────────────────

export function renderCategories(containerEl, categories, activeId) {
  containerEl.innerHTML = categories.map(cat => `
    <button
      class="category-chip${cat.id === activeId ? ' active' : ''}"
      data-category="${cat.id}"
      role="tab"
      aria-selected="${cat.id === activeId}"
    >${cat.label}</button>
  `).join('');
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export function renderCartItems(bodyEl, items) {
  if (items.length === 0) {
    bodyEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <div class="cart-empty__title">Корзина пуста</div>
        <div class="cart-empty__subtitle">Добавьте позиции из меню, чтобы начать заказ</div>
      </div>
    `;
    return;
  }

  const gradientFor = (category) => (CATEGORY_META[category] || { gradient: 'linear-gradient(135deg, #111, #222)' }).gradient;
  const imageFor = (item) => item.image || PRODUCTS.find(p => p.id === item.id)?.image || '';

  bodyEl.innerHTML = items.map((item, index) => {
    const customLines = [];
    if (item.removes?.length) customLines.push(...item.removes);
    if (item.extras?.length) customLines.push(...item.extras.map(e => `+${e}`));
    if (item.size) customLines.push(`Размер: ${item.size}`);
    if (item.drinkChoice) customLines.push(`Напиток: ${item.drinkChoice}`);
    const customHTML = customLines.length
      ? `<div class="cart-item__custom">${customLines.join(' · ')}</div>`
      : '';

    return `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item__thumb" style="background: ${gradientFor(item.category)}">
          <img src="${imageFor(item)}" alt="${item.name}" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          ${customHTML}
          <div class="cart-item__price">${formatPrice(item.price)}</div>
          <div class="cart-item__controls">
            <button class="qty-btn" data-qty-dec="${index}" aria-label="Уменьшить количество">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-qty-inc="${index}" aria-label="Увеличить количество">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-remove="${index}" aria-label="Убрать ${item.name}">✕</button>
      </div>
    `;
  }).join('');
}

export function renderCartFooter(footerEl, subtotal, deliveryFee, total, hasItems, onCheckout) {
  if (!hasItems) {
    footerEl.innerHTML = '';
    return;
  }

  const isFreeDelivery = subtotal >= STORE.freeDeliveryAbove;
  const feeText = isFreeDelivery
    ? '<span style="color: var(--clr-success)">Бесплатно 🎉</span>'
    : formatPrice(deliveryFee);
  const missing = STORE.freeDeliveryAbove - subtotal;

  footerEl.innerHTML = `
    ${!isFreeDelivery && missing > 0 ? `
      <p class="cart-totals__free-delivery">
        До бесплатной доставки осталось <strong>${formatPrice(missing)}</strong>!
      </p>` : ''}
    <div class="cart-totals">
      <div class="cart-totals__row">
        <span>Сумма</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <div class="cart-totals__row">
        <span>Доставка</span>
        <span>${feeText}</span>
      </div>
      <div class="cart-totals__row cart-totals__row--total">
        <span>Итого</span>
        <span>${formatPrice(total)}</span>
      </div>
    </div>
    <button class="btn btn--primary btn--full" id="checkoutBtn">
      Оформить заказ
    </button>
  `;

  document.getElementById('checkoutBtn')?.addEventListener('click', onCheckout);
}

// ─── Cart badge & bar ────────────────────────────────────────────────────────

export function updateCartBadge(countEl, count) {
  countEl.textContent = count;
  countEl.classList.toggle('hidden', count === 0);
  if (count > 0) {
    countEl.animate(
      [{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }],
      { duration: 250, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }
}

export function updateCartBar(barEl, infoEl, btnEl, count, total) {
  if (count === 0) {
    barEl.setAttribute('hidden', '');
    return;
  }
  barEl.removeAttribute('hidden');
  infoEl.textContent = `${count} ${pluralizeItems(count)}`;
  btnEl.textContent = `В корзину · ${formatPrice(total)}`;
}

// ─── Drawer & modal ──────────────────────────────────────────────────────────

export function openCartDrawer(drawerEl, overlayEl) {
  drawerEl.classList.add('open');
  overlayEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeCartDrawer(drawerEl, overlayEl) {
  drawerEl.classList.remove('open');
  overlayEl.classList.remove('open');
  document.body.style.overflow = '';
}

export function openModal(modalEl, overlayEl) {
  modalEl.classList.add('open');
  overlayEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalEl, overlayEl) {
  modalEl.classList.remove('open');
  overlayEl.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Toast ───────────────────────────────────────────────────────────────────

export function showToast(containerEl, message, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  containerEl.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2800);
}

// ─── Add to cart animation ───────────────────────────────────────────────────

export function animateAddBtn(btn) {
  const original = btn.textContent;
  btn.textContent = '✓';
  btn.style.background = 'var(--clr-success)';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.style.background = '';
    btn.disabled = false;
  }, 700);
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export function toggleFavorite(productId) {
  if (favorites.has(productId)) {
    favorites.delete(productId);
  } else {
    favorites.add(productId);
  }
  saveFavorites(favorites);
  return favorites.has(productId);
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export function renderReviews(containerEl, reviews) {
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  containerEl.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-card__header">
        <div class="review-avatar" style="--avatar-bg: ${r.color}">${r.initials}</div>
        <div>
          <div class="review-card__name">${r.name}</div>
          <div class="review-card__time">${r.time}</div>
        </div>
        <div class="review-card__stars" aria-label="${r.rating} звёзд">${stars(r.rating)}</div>
      </div>
      <p class="review-card__text">"${r.text}"</p>
    </div>
  `).join('');
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function toggleEmptyState(emptyEl, gridEl, show) {
  if (show) {
    emptyEl.removeAttribute('hidden');
    gridEl.style.display = 'none';
  } else {
    emptyEl.setAttribute('hidden', '');
    gridEl.style.display = '';
  }
}

// ─── Share ───────────────────────────────────────────────────────────────────

export async function shareMenu(toastContainerEl) {
  const data = { title: 'Зёрна', text: 'Загляните в меню кофейни «Зёрна»!', url: SITE_URL };
  if (navigator.share) {
    try { await navigator.share(data); } catch { /* user cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      showToast(toastContainerEl, '🔗 Ссылка скопирована в буфер обмена!', 'success');
    } catch {
      showToast(toastContainerEl, '🔗 Скопируйте ссылку из адресной строки!', 'default');
    }
  }
}
