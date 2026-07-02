import { formatPrice } from './data.js';

export function openCustomizationModal(product, onConfirm) {
  const modal = document.getElementById('customizeModal');
  const overlay = document.getElementById('customizeOverlay');
  const titleEl = document.getElementById('customizeTitle');
  const bodyEl = document.getElementById('customizeBody');
  const confirmBtn = document.getElementById('customizeConfirmBtn');

  titleEl.textContent = product.name;
  bodyEl.innerHTML = buildFormHTML(product);

  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const updateTotal = () => {
    const { extraTotal } = readFormData(product, bodyEl);
    confirmBtn.textContent = `Adicionar por ${formatPrice(product.price + extraTotal)}`;
  };

  const close = () => {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    bodyEl.removeEventListener('change', updateTotal);
    overlay.onclick = null;
    confirmBtn.onclick = null;
    document.removeEventListener('keydown', onKeydown);
    bodyEl.innerHTML = '';
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') close();
  };

  bodyEl.addEventListener('change', updateTotal);
  document.getElementById('customizeCloseBtn').onclick = close;
  overlay.onclick = close;
  document.addEventListener('keydown', onKeydown);
  confirmBtn.onclick = () => {
    const result = readFormData(product, bodyEl);
    close();
    onConfirm(result);
  };

  updateTotal();
}

function buildFormHTML(product) {
  const parts = [`
    <div class="customize-summary">
      <div class="customize-summary__thumb">
        <img src="${product.image}" alt="${product.name}" onerror="this.style.opacity='0'">
      </div>
      <div class="customize-summary__info">
        <div class="customize-summary__name">${product.name}</div>
        <div class="customize-summary__price">Preço base ${formatPrice(product.price)}</div>
      </div>
    </div>
  `];

  if (product.drinkOptions) {
    parts.push(`
      <div class="customize-group">
        <div class="customize-group__title">
          Escolha sua bebida <span class="customize-required">obrigatório</span>
        </div>
        <div class="customize-options customize-options--chips">
          ${product.drinkOptions.map((drink, i) => `
            <label class="customize-radio">
              <input type="radio" name="drinkChoice" value="${drink}" ${i === 0 ? 'checked' : ''}>
              <span class="customize-radio__label">${drink}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `);
    return parts.join('');
  }

  const c = product.customizations;
  if (!c) return parts.join('') + '<p class="customize-empty">Nenhuma personalização disponível.</p>';

  if (c.removes?.length) {
    parts.push(`
      <div class="customize-group">
        <div class="customize-group__title">Remover ingredientes</div>
        <div class="customize-options customize-options--chips">
          ${c.removes.map(r => `
            <label class="customize-chip">
              <input type="checkbox" name="remove" value="${r}">
              <span class="customize-chip__label">${r}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `);
  }

  if (c.extras?.length) {
    parts.push(`
      <div class="customize-group">
        <div class="customize-group__title">Adicionais</div>
        <div class="customize-options">
          ${c.extras.map(e => `
            <label class="customize-check">
              <input type="checkbox" name="extra" value="${e.label}" data-price="${e.price}">
              <span class="customize-check__label">
                ${e.label}
                <span class="customize-check__price">+${formatPrice(e.price)}</span>
              </span>
            </label>
          `).join('')}
        </div>
      </div>
    `);
  }

  if (c.meatPoints?.length) {
    parts.push(`
      <div class="customize-group">
        <div class="customize-group__title">Ponto da carne</div>
        <div class="customize-options customize-options--chips">
          ${c.meatPoints.map(mp => `
            <label class="customize-radio">
              <input type="radio" name="meatPoint" value="${mp}" ${mp === (c.defaultMeatPoint ?? c.meatPoints[1]) ? 'checked' : ''}>
              <span class="customize-radio__label">${mp}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `);
  }

  return parts.join('');
}

function readFormData(product, formEl) {
  const result = {
    removes: [],
    extras: [],
    meatPoint: null,
    drinkChoice: null,
    extraTotal: 0,
  };

  formEl.querySelectorAll('input[name="remove"]:checked').forEach(el => {
    result.removes.push(el.value);
  });

  formEl.querySelectorAll('input[name="extra"]:checked').forEach(el => {
    const price = parseFloat(el.dataset.price || 0);
    result.extras.push({ label: el.value, price });
    result.extraTotal += price;
  });

  const meatEl = formEl.querySelector('input[name="meatPoint"]:checked');
  if (meatEl) result.meatPoint = meatEl.value;

  const drinkEl = formEl.querySelector('input[name="drinkChoice"]:checked');
  if (drinkEl) result.drinkChoice = drinkEl.value;

  return result;
}
