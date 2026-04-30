/**
 * cart.js — Self-contained shopping cart for the Stylish template.
 *
 * Depends on:
 *   - window.allProducts  (set by products.js after fetch)
 *   - Bootstrap 5 modal API (window.bootstrap.Modal)
 *
 * Exposes:
 *   - window.cart.add(id, qty=1)
 *   - window.cart.remove(id)
 *   - window.cart.setQty(id, qty)
 *   - window.cart.clear()
 *   - window.cart.subscribe(cb)   → cb({items, count, total})
 *   - window.cart.getSnapshot()
 */
(function () {
  'use strict';

  /* ----- config ----- */
  const STORAGE_KEY = 'stylish_cart_v1';
  const QTY_MIN = 1;
  const QTY_MAX = 99;
  const TOAST_MS = 2200;

  /* ----- state ----- */
  // Persisted shape: [{ id, qty }]. Display fields are joined from window.allProducts at render time.
  let _items = [];
  const _subs = [];

  /* ----- persistence ----- */
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const validIds = new Set((window.allProducts || []).map(p => p.id));
      return parsed
        .filter(entry => entry && typeof entry.id === 'number' && validIds.has(entry.id))
        .map(entry => ({ id: entry.id, qty: clamp(Number(entry.qty) || 1, QTY_MIN, QTY_MAX) }));
    } catch {
      return [];
    }
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_items));
    } catch {
      // storage may be full or disabled — fail silently, in-memory state stays correct
    }
  }

  // Single mutation tail: persist, re-render the modal, broadcast to subscribers.
  function _commit(meta) {
    _save();
    _renderModal();
    _notify(meta);
  }

  /* ----- subscribers ----- */
  function subscribe(cb) {
    if (typeof cb === 'function') _subs.push(cb);
    return () => {
      const i = _subs.indexOf(cb);
      if (i >= 0) _subs.splice(i, 1);
    };
  }

  function _notify(meta) {
    const snap = getSnapshot();
    _subs.forEach(cb => {
      try { cb(snap, meta || null); } catch (e) { console.error('cart subscriber error:', e); }
    });
  }

  function getSnapshot() {
    const products = window.allProducts || [];
    const lookup = new Map(products.map(p => [p.id, p]));
    const items = _items
      .map(({ id, qty }) => {
        const p = lookup.get(id);
        return p ? { id, qty, name: p.name, price: p.price, image_url: p.image_url } : null;
      })
      .filter(Boolean);
    const count = items.reduce((sum, it) => sum + it.qty, 0);
    const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    return { items, count, total };
  }

  /* ----- mutations ----- */
  function add(productId, qty = 1) {
    const id = Number(productId);
    if (!Number.isFinite(id)) return;
    const products = window.allProducts || [];
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = _items.find(it => it.id === id);
    if (existing) {
      existing.qty = clamp(existing.qty + qty, QTY_MIN, QTY_MAX);
    } else {
      _items.push({ id, qty: clamp(qty, QTY_MIN, QTY_MAX) });
    }
    _commit({ pulse: true });
    _showToast(`Added <strong>${escapeHtml(product.name)}</strong> to cart`);
  }

  function setQty(productId, qty) {
    const id = Number(productId);
    const next = clamp(Number(qty) || 0, 0, QTY_MAX);
    const idx = _items.findIndex(it => it.id === id);
    if (idx < 0) return;
    if (next < QTY_MIN) {
      _items.splice(idx, 1);
    } else {
      _items[idx].qty = next;
    }
    _commit();
  }

  function remove(productId) {
    const id = Number(productId);
    const idx = _items.findIndex(it => it.id === id);
    if (idx < 0) return;
    _items.splice(idx, 1);
    _commit();
  }

  function clear() {
    _items = [];
    _commit();
  }

  /* ----- render ----- */
  function _renderModal() {
    const list = document.getElementById('cart-items-list');
    const empty = document.getElementById('cart-empty-msg');
    const subtotal = document.getElementById('cart-subtotal');
    if (!list || !subtotal) return;

    const { items, total } = getSnapshot();

    if (items.length === 0) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      subtotal.textContent = '$0.00';
      return;
    }

    if (empty) empty.hidden = true;

    list.innerHTML = items.map(item => `
      <div class="mini-cart cart-list p-0 mt-3">
        <div class="mini-cart-item d-flex border-bottom pb-3" data-cart-id="${item.id}">
          <div class="col-lg-2 col-md-3 col-sm-2 me-4">
            <img src="${escapeHtml(item.image_url)}" class="img-fluid" alt="${escapeHtml(item.name)}">
          </div>
          <div class="col-lg-9 col-md-8 col-sm-8">
            <div class="product-header d-flex justify-content-between align-items-center mb-3">
              <h4 class="product-title fs-6 me-5">${escapeHtml(item.name)}</h4>
              <a href="#" class="remove" aria-label="Remove ${escapeHtml(item.name)}" data-cart-action="remove" data-cart-id="${item.id}">
                <svg class="close" width="14" height="14"><use xlink:href="#close"></use></svg>
              </a>
            </div>
            <div class="quantity-price d-flex justify-content-between align-items-center">
              <div class="input-group cart-product-qty">
                <button type="button" class="quantity-left-minus btn btn-light rounded-0 rounded-start btn-number" data-cart-action="dec" data-cart-id="${item.id}" aria-label="Decrease quantity">
                  <svg width="16" height="16"><use xlink:href="#minus"></use></svg>
                </button>
                <input type="text" class="form-control input-number quantity" value="${item.qty}" data-cart-input data-cart-id="${item.id}" inputmode="numeric" aria-label="Quantity">
                <button type="button" class="quantity-right-plus btn btn-light rounded-0 rounded-end btn-number" data-cart-action="inc" data-cart-id="${item.id}" aria-label="Increase quantity">
                  <svg width="16" height="16"><use xlink:href="#plus"></use></svg>
                </button>
              </div>
              <div class="price-code">
                <span class="product-price fs-6">$${(item.price * item.qty).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    subtotal.textContent = `$${total.toFixed(2)}`;
  }

  /* ----- event delegation (cart modal) ----- */
  function _wireCartModal() {
    const modal = document.getElementById('modallong');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-cart-action]');
      if (!trigger) return;
      e.preventDefault();
      const id = Number(trigger.dataset.cartId);
      const action = trigger.dataset.cartAction;
      const item = _items.find(it => it.id === id);
      if (!item && action !== 'remove') return;

      if (action === 'inc')      setQty(id, (item?.qty || 0) + 1);
      else if (action === 'dec') setQty(id, (item?.qty || 0) - 1);
      else if (action === 'remove') remove(id);
    });

    modal.addEventListener('change', (e) => {
      const input = e.target.closest('[data-cart-input]');
      if (!input) return;
      setQty(Number(input.dataset.cartId), Number(input.value));
    });

    // Re-render on open in case storage changed in another tab while modal was hidden
    modal.addEventListener('show.bs.modal', _renderModal);
  }

  /* ----- product grid binding (add-to-cart) ----- */
  function _wireProductGrid() {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      e.preventDefault();
      add(Number(btn.dataset.id), 1);
    });
  }

  /* ----- quick-view binding ----- */
  function _wireQuickView() {
    const modal = document.getElementById('modaltoggle');
    if (!modal) return;

    modal.addEventListener('show.bs.modal', (e) => {
      // Clear stale id first so a prior product can never leak into a failed re-open.
      modal.dataset.productId = '';
      const trigger = e.relatedTarget;
      if (!trigger) return;
      const id = Number(trigger.dataset.productId);
      const product = (window.allProducts || []).find(p => p.id === id);
      if (!product) return;

      modal.dataset.productId = String(id);
      setText(modal.querySelector('#qv-name'), product.name);
      setText(modal.querySelector('#qv-price'), `$${Number(product.price).toFixed(2)}`);
      setText(modal.querySelector('#qv-description'), product.description || '');
      setText(modal.querySelector('#qv-category'), product.category || '—');
      const img = modal.querySelector('#qv-image');
      if (img) {
        img.src = product.image_url;
        img.alt = product.name;
      }
      const qtyInput = modal.querySelector('#quantity_001');
      if (qtyInput) qtyInput.value = '1';
    });

    // qty +/- inside the quick-view
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qv-action]');
      if (!btn) return;
      const input = modal.querySelector('#quantity_001');
      if (!input) return;
      const current = clamp(parseInt(input.value, 10) || 1, QTY_MIN, QTY_MAX);
      const next = btn.dataset.qvAction === 'inc'
        ? clamp(current + 1, QTY_MIN, QTY_MAX)
        : clamp(current - 1, QTY_MIN, QTY_MAX);
      input.value = String(next);
    });

    const form = modal.querySelector('#qv-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = Number(modal.dataset.productId);
        const qtyInput = modal.querySelector('#quantity_001');
        const qty = clamp(parseInt(qtyInput?.value, 10) || 1, QTY_MIN, QTY_MAX);
        if (!Number.isFinite(id)) return;
        add(id, qty);
        const instance = window.bootstrap?.Modal.getInstance(modal);
        if (instance) instance.hide();
      });
    }
  }

  /* ----- cross-tab sync ----- */
  // The `storage` event only fires in OTHER tabs (per spec), so no own-write guard is needed.
  function _wireStorageSync() {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      _items = _load();
      _renderModal();
      _notify();
    });
  }

  /* ----- toast ----- */
  let _toastEl = null;
  let _toastTimer = null;
  function _showToast(html) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.className = 'cart-toast';
      _toastEl.setAttribute('role', 'status');
      _toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(_toastEl);
    }
    _toastEl.innerHTML = html;
    // Force reflow so the transition replays on rapid successive adds.
    void _toastEl.offsetWidth;
    _toastEl.classList.add('cart-toast--show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      _toastEl.classList.remove('cart-toast--show');
    }, TOAST_MS);
  }

  /* ----- badge subscriber ----- */
  function _wireBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    subscribe(({ count }, meta) => {
      if (count > 0) {
        badge.textContent = String(count);
        badge.classList.add('cart-badge--visible');
      } else {
        badge.classList.remove('cart-badge--visible');
      }
      if (meta && meta.pulse) {
        badge.classList.remove('cart-badge--pulse');
        void badge.offsetWidth;
        badge.classList.add('cart-badge--pulse');
      }
    });
  }

  /* ----- helpers ----- */
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ----- init ----- */
  function init() {
    // window.allProducts is populated asynchronously by products.js after fetch.
    // Wait for the `productsReady` signal before the stale-product-aware first load.
    const hydrate = () => {
      _items = _load();
      _wireBadge();
      _wireCartModal();
      _wireProductGrid();
      _wireQuickView();
      _wireStorageSync();
      _renderModal();
      _notify();
    };

    if (window.allProducts && window.allProducts.length) {
      hydrate();
    } else {
      document.addEventListener('productsReady', hydrate, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ----- public API ----- */
  window.cart = { add, remove, setQty, clear, subscribe, getSnapshot };
})();
