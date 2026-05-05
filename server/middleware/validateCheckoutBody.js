/**
 * middleware/validateCheckoutBody.js — Checkout Gatekeeper
 *
 * Validates the POST /api/checkout request body BEFORE the controller runs.
 * Returns a specific 400 error message for each failed field so the frontend
 * can display targeted feedback WITHOUT clearing the user's cart.
 *
 * Checks (in order):
 *   1. `cart`       — required non-empty array; each item must have a valid
 *                     id (number), name (string), price (positive number),
 *                     and quantity (positive integer).
 *   2. `email`      — required, valid email shape (RFC-5322 simplified regex).
 *   3. `cardNumber` — required, exactly 16 digits after stripping spaces/dashes.
 *
 * Request lifecycle position:
 *   POST /api/checkout
 *     → [validateCheckoutBody ← YOU ARE HERE]
 *     → [checkoutController]
 *     → [checkoutService]
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CC_RE    = /^\d{16}$/;          // applied AFTER stripping spaces and dashes

/**
 * validateCheckoutBody
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
function validateCheckoutBody(req, res, next) {
  const body = req.body ?? {};
  const { cart, email, cardNumber } = body;

  // ── 1. Cart ───────────────────────────────────────────────────────────────
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      field:   'cart',
      error:   'Your cart is empty. Add at least one item before checking out.',
    });
  }

  for (const [i, item] of cart.entries()) {
    const badId  = !item || typeof item.id !== 'number';
    const badName = typeof item.name !== 'string' || item.name.trim() === '';
    const badPrice = typeof item.price !== 'number' || item.price <= 0;
    const badQty  = !Number.isInteger(item.quantity) || item.quantity < 1;

    if (badId || badName || badPrice || badQty) {
      return res.status(400).json({
        success: false,
        field:   'cart',
        error:   `Cart item at index ${i} is malformed (must have id, name, price > 0, quantity ≥ 1).`,
      });
    }
  }

  // ── 2. Email ──────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({
      success: false,
      field:   'email',
      error:   '`email` is required.',
    });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({
      success: false,
      field:   'email',
      error:   '`email` must be a valid address (e.g. you@example.com).',
    });
  }

  // ── 3. Card number ────────────────────────────────────────────────────────
  if (!cardNumber || typeof cardNumber !== 'string' || cardNumber.trim() === '') {
    return res.status(400).json({
      success: false,
      field:   'cardNumber',
      error:   '`cardNumber` is required.',
    });
  }
  // Strip spaces and dashes that users naturally type (e.g. "4111 1111 1111 1111")
  const digitsOnly = cardNumber.replace(/[\s\-]/g, '');
  if (!CC_RE.test(digitsOnly)) {
    return res.status(400).json({
      success: false,
      field:   'cardNumber',
      error:   '`cardNumber` must be exactly 16 digits.',
    });
  }

  // ── Normalise in-place before controller receives the body ────────────────
  req.body.email      = email.trim().toLowerCase();
  req.body.cardNumber = digitsOnly;     // normalised to 16 raw digits
  next();
}

module.exports = { validateCheckoutBody };
