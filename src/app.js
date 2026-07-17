import { PRODUCTS, CATEGORIES, STORE, REVIEWS, PROMO_BANNERS, isStoreOpen, formatPrice } from './data.js';
import { addItem, addItemWithCustomizations, removeItem, updateQty, getItems, getCount, getSubtotal, clearCart } from './cart.js';
import { filterProducts } from './filters.js';
import { initSearch } from './search.js';
import { openCustomizationModal } from './customize.js';
import { initCheckoutForm, renderCheckoutSummary } from './checkout.js';
import {
  renderSkeletons, renderProductsGrid, renderFeatured, renderCategories,
  renderCartItems, renderCartFooter,
  updateCartBadge, updateCartBar,
  openCartDrawer, closeCartDrawer, openModal, closeModal,
  showToast, animateAddBtn, toggleFavorite,
  toggleEmptyState, renderReviews, shareMenu,
} from './ui.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const productsGrid      = $('productsGrid');
const featuredProducts  = $('featuredProducts');
const categoryFilter    = $('categoryFilter');
const searchInput       = $('searchInput');
const emptyState        = $('emptyState');
const toastContainer    = $('toastContainer');

const cartBtn           = $('cartBtn');
const cartCount         = $('cartCount');
const cartDrawer        = $('cartDrawer');
const cartOverlay       = $('cartOverlay');
const cartDrawerBody    = $('cartDrawerBody');
const cartDrawerFooter  = $('cartDrawerFooter');
const closeCartBtn      = $('closeCartBtn');

const cartBar           = $('cartBar');
const cartBarInfo       = $('cartBarInfo');
const cartBarBtn        = $('cartBarBtn');

const modalEl           = $('checkoutModal');
const modalOverlay      = $('modalOverlay');
const closeModalBtn     = $('closeModalBtn');
const backToCartBtn     = $('backToCartBtn');
const checkoutSummary   = $('checkoutSummary');
const checkoutFormEl    = $('checkoutForm');
const storeClosedBanner = $('storeClosedBanner');
const storeStatusDot    = $('storeStatusDot');
const storeStatusText   = $('storeStatusText');
const reviewsContainer  = $('reviewsContainer');
const shareBtnEl        = $('shareBtn');
const heroShareBtn      = $('heroShareBtn');

// ─── State ────────────────────────────────────────────────────────────────────

let activeCategory = 'all';
let searchTerm = '';

// ─── Cart UI ──────────────────────────────────────────────────────────────────

function refreshCart() {
  const items = getItems();
  const count = getCount();
  const subtotal = getSubtotal();
  const deliveryFee = subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  const total = subtotal + deliveryFee;

  renderCartItems(cartDrawerBody, items);
  renderCartFooter(cartDrawerFooter, subtotal, deliveryFee, total, items.length > 0, openCheckout);
  updateCartBadge(cartCount, count);
  updateCartBar(cartBar, cartBarInfo, cartBarBtn, count, total);
}

// ─── Products ─────────────────────────────────────────────────────────────────

function refreshProducts() {
  const filtered = filterProducts(PRODUCTS, { category: activeCategory, searchTerm });
  toggleEmptyState(emptyState, productsGrid, filtered.length === 0);
  if (filtered.length > 0) renderProductsGrid(productsGrid, filtered);
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

function openCheckout() {
  closeCartDrawer(cartDrawer, cartOverlay);
  renderCheckoutSummary(checkoutSummary);
  openModal(modalEl, modalOverlay);
}

// ─── Rotating promo banner ────────────────────────────────────────────────────

function initRotatingBanner() {
  const bannerIcon = $('promoBannerIcon');
  const bannerText = $('promoBannerText');
  if (!bannerIcon || !bannerText) return;

  let idx = 0;
  const update = () => {
    const banner = PROMO_BANNERS[idx];
    bannerIcon.style.opacity = '0';
    bannerText.style.opacity = '0';
    setTimeout(() => {
      bannerIcon.textContent = banner.icon;
      bannerText.textContent = banner.text;
      bannerIcon.style.opacity = '1';
      bannerText.style.opacity = '1';
    }, 300);
    idx = (idx + 1) % PROMO_BANNERS.length;
  };
  setInterval(update, 4000);
}

// ─── Store status ─────────────────────────────────────────────────────────────

function updateStoreStatus() {
  const open = isStoreOpen();
  if (!open && storeClosedBanner) storeClosedBanner.removeAttribute('hidden');
  if (storeStatusDot) storeStatusDot.className = `status-dot status-dot--${open ? 'open' : 'closed'}`;
  if (storeStatusText) storeStatusText.textContent = open ? 'Открыто сейчас' : 'Закрыто';
}

// ─── Event delegation: catalog ───────────────────────────────────────────────

productsGrid.addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) {
    const id = Number(addBtn.dataset.add);
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;

    if (product.customizations || product.drinkOptions) {
      openCustomizationModal(product, (result) => {
        addItemWithCustomizations(product, result);
        showToast(toastContainer, `✓ ${product.name} добавлен`, 'success');
      });
    } else {
      addItem(product);
      animateAddBtn(addBtn);
      showToast(toastContainer, `✓ ${product.name} adicionado`, 'success');
    }
    return;
  }

  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    const id = Number(favBtn.dataset.fav);
    const isFav = toggleFavorite(id);
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.classList.toggle('active', isFav);
    favBtn.setAttribute('aria-label', isFav ? 'Убрать из избранного' : 'Добавить в избранное');
    showToast(toastContainer, isFav ? '❤️ Добавлено в избранное' : '🤍 Убрано из избранного');
  }
});

// ─── Event delegation: cart body ─────────────────────────────────────────────

cartDrawerBody.addEventListener('click', (e) => {
  const inc = e.target.closest('[data-qty-inc]');
  if (inc) { updateQty(Number(inc.dataset.qtyInc), 1); return; }

  const dec = e.target.closest('[data-qty-dec]');
  if (dec) { updateQty(Number(dec.dataset.qtyDec), -1); return; }

  const rem = e.target.closest('[data-remove]');
  if (rem) removeItem(Number(rem.dataset.remove));
});

// ─── Event delegation: featured ──────────────────────────────────────────────

featuredProducts.addEventListener('click', (e) => {
  const card = e.target.closest('[data-id]');
  if (!card) return;
  const id = Number(card.dataset.id);
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  if (product.customizations || product.drinkOptions) {
    openCustomizationModal(product, (result) => {
      addItemWithCustomizations(product, result);
      showToast(toastContainer, `✓ ${product.name} adicionado`, 'success');
    });
  } else {
    addItem(product);
    showToast(toastContainer, `✓ ${product.name} adicionado`, 'success');
  }
});

// ─── Category filter ─────────────────────────────────────────────────────────

categoryFilter.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-category]');
  if (!chip) return;
  activeCategory = chip.dataset.category;
  renderCategories(categoryFilter, CATEGORIES, activeCategory);
  refreshProducts();
});

// ─── Cart open/close ─────────────────────────────────────────────────────────

cartBtn.addEventListener('click', () => openCartDrawer(cartDrawer, cartOverlay));
closeCartBtn.addEventListener('click', () => closeCartDrawer(cartDrawer, cartOverlay));
cartOverlay.addEventListener('click', () => closeCartDrawer(cartDrawer, cartOverlay));
cartBarBtn.addEventListener('click', () => openCartDrawer(cartDrawer, cartOverlay));

// ─── Checkout modal ───────────────────────────────────────────────────────────

closeModalBtn.addEventListener('click', () => closeModal(modalEl, modalOverlay));
modalOverlay.addEventListener('click', () => closeModal(modalEl, modalOverlay));
backToCartBtn.addEventListener('click', () => {
  closeModal(modalEl, modalOverlay);
  openCartDrawer(cartDrawer, cartOverlay);
});

// ─── Keyboard ────────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('customizeModal')?.classList.contains('open')) return;
  if (modalEl.classList.contains('open')) { closeModal(modalEl, modalOverlay); return; }
  if (cartDrawer.classList.contains('open')) closeCartDrawer(cartDrawer, cartOverlay);
});

// ─── Share ────────────────────────────────────────────────────────────────────

shareBtnEl?.addEventListener('click', () => shareMenu(toastContainer));
heroShareBtn?.addEventListener('click', () => shareMenu(toastContainer));

// ─── Promo banner dismiss ─────────────────────────────────────────────────────

$('promoBannerDismiss')?.addEventListener('click', () => {
  $('promoBanner')?.setAttribute('hidden', '');
});

// ─── Cart event ───────────────────────────────────────────────────────────────

document.addEventListener('cart:updated', refreshCart);

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  updateStoreStatus();

  const featured = PRODUCTS.filter(p => p.featured && p.available);
  renderFeatured(featuredProducts, featured);

  renderCategories(categoryFilter, CATEGORIES, activeCategory);

  if (reviewsContainer) renderReviews(reviewsContainer, REVIEWS);

  initSearch(searchInput, (term) => {
    searchTerm = term;
    refreshProducts();
  });

  initCheckoutForm(checkoutFormEl, (orderLabel) => {
    closeModal(modalEl, modalOverlay);
    clearCart();
    const label = orderLabel ? ` Заказ ${orderLabel}` : '';
    showToast(toastContainer, `🎉 Заказ отправлен в WhatsApp!${label}`, 'success');
  });

  initRotatingBanner();
  refreshCart();

  // Skeleton loading: show skeletons, then render after 300ms
  renderSkeletons(productsGrid, 6);
  setTimeout(() => {
    refreshProducts();
  }, 300);
}

document.addEventListener('DOMContentLoaded', init);
