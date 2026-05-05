/**
 * js/checkout.js
 *
 * Connects the #modalcheckout form to POST /api/checkout.
 *
 * Flow:
 *   1. When the checkout modal opens → snapshot the cart and render an
 *      order summary so the user sees what they're paying for.
 *   2. On submit → build the JSON payload and POST to /api/checkout.
 *   3. On success (200) → show confirmation, close modal, CLEAR the cart.
 *   4. On any error (400/500/network) → show the specific server error
 *      message ABOVE the form and DO NOT clear the cart.
 *
 * Depends on:
 *   - window.cart   (exposed by cart.js)
 *   - Bootstrap 5   (window.bootstrap)
 *
 * No jQuery — vanilla JS only.
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.className = `auth-message auth-message--${type}`;
  }

  function clearMsg(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Processing…' : btn.dataset.originalText;
  }

  function fmt(n) {
    return `$${Number(n).toFixed(2)}`;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Card number formatting (visual spaces every 4 digits) ──────────────────
  function formatCardInput(input) {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 16);
      input.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  // ── Order summary renderer ─────────────────────────────────────────────────
  function renderSummary(items, total) {
    const el = document.getElementById('checkout-summary');
    if (!el) return;

    if (items.length === 0) {
      el.innerHTML = '<p class="text-muted small">Your cart is empty.</p>';
      return;
    }

    const rows = items.map((it) => `
      <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
        <span class="small">${escHtml(it.name)} <span class="text-muted">×${it.qty}</span></span>
        <span class="small fw-semibold">${fmt(it.price * it.qty)}</span>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="checkout-order-summary mb-3">
        <p class="checkout-summary-label">Order Summary</p>
        ${rows}
        <div class="d-flex justify-content-between align-items-center pt-2">
          <span class="fw-bold">Total</span>
          <span class="fw-bold" style="color:var(--ed-crimson,#c8351f)">${fmt(total)}</span>
        </div>
      </div>
    `;
  }

  // ── Modal wiring ───────────────────────────────────────────────────────────
  const checkoutModal = document.getElementById('modalcheckout');
  const checkoutForm  = document.getElementById('checkout-form');
  const errEl         = document.getElementById('checkout-error');
  const okEl          = document.getElementById('checkout-success');
  const submitBtn     = document.getElementById('checkout-submit');
  const cardInput     = document.getElementById('checkout-card');

  if (!checkoutModal || !checkoutForm) return;

  // Format card input on each keystroke
  if (cardInput) formatCardInput(cardInput);

  // Populate order summary each time the modal opens
  checkoutModal.addEventListener('show.bs.modal', () => {
    clearMsg(errEl);
    clearMsg(okEl);
    checkoutForm.reset();
    if (submitBtn) submitBtn.disabled = false;

    const snap = window.cart ? window.cart.getSnapshot() : { items: [], total: 0 };
    renderSummary(snap.items, snap.total);

    // Pre-fill email from stored session if available
    try {
      const user = JSON.parse(localStorage.getItem('stylish_user'));
      const emailInput = checkoutForm.querySelector('[name="email"]');
      if (user && user.email && emailInput && !emailInput.value) {
        emailInput.value = user.email;
      }
    } catch { /* ignore */ }
  });

  // ── Cart modal "Checkout" button → close cart, open checkout ──────────────
  const openCheckoutBtn = document.getElementById('open-checkout-btn');
  if (openCheckoutBtn) {
    openCheckoutBtn.addEventListener('click', () => {
      // Close cart modal first, then open checkout after it finishes hiding
      const cartModalEl = document.getElementById('modallong');
      if (cartModalEl) {
        const cartModal = window.bootstrap.Modal.getInstance(cartModalEl);
        if (cartModal) {
          cartModalEl.addEventListener('hidden.bs.modal', () => {
            new window.bootstrap.Modal(checkoutModal).show();
          }, { once: true });
          cartModal.hide();
          return;
        }
      }
      new window.bootstrap.Modal(checkoutModal).show();
    });
  }

  // ── Form submit → POST /api/checkout ──────────────────────────────────────
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg(errEl);
    clearMsg(okEl);
    setLoading(submitBtn, true);

    // Build cart payload from current snapshot
    const snap = window.cart ? window.cart.getSnapshot() : { items: [], total: 0 };

    if (snap.items.length === 0) {
      showMsg(errEl, 'Your cart is empty. Add items before checking out.', 'error');
      setLoading(submitBtn, false);
      return;
    }

    const cartPayload = snap.items.map((it) => ({
      id:       it.id,
      name:     it.name,
      price:    it.price,
      quantity: it.qty,
    }));

    const emailVal = (checkoutForm.querySelector('[name="email"]')?.value ?? '').trim();
    const cardVal  = (checkoutForm.querySelector('[name="cardNumber"]')?.value ?? '')
                       .replace(/[\s\-]/g, '');

    try {
      const res  = await fetch((window.API_BASE || '') + '/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cart:       cartPayload,
          email:      emailVal,
          cardNumber: cardVal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server returned a specific error message per field — display it.
        // The cart is NOT cleared so the user can fix and resubmit.
        showMsg(errEl, data.error || 'Checkout failed. Please try again.', 'error');
        return;
      }

      // ── Success path ─────────────────────────────────────────────────────
      showMsg(okEl, data.message, 'success');
      checkoutForm.reset();

      // Clear cart only on confirmed success
      if (window.cart) window.cart.clear();

      // Close modal after a short delay so the user reads the confirmation
      setTimeout(() => {
        const modal = window.bootstrap.Modal.getInstance(checkoutModal);
        if (modal) modal.hide();
      }, 2500);

    } catch (networkErr) {
      // Log the real error so the browser console tells us exactly what failed
      console.error('[checkout] caught:', networkErr);
      showMsg(errEl, 'Error: ' + (networkErr?.message || networkErr), 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });

})();
