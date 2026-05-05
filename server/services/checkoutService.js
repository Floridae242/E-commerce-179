/**
 * services/checkoutService.js
 *
 * Handles all checkout business logic:
 *   1. Dynamically calculate the order total from cart items.
 *   2. Build a complete order record.
 *   3. Persist the order to data/json/orders.json inside a try…catch.
 *      If the write fails → throw SAVE_FAILED so the controller can return
 *      a 400 WITHOUT clearing the user's cart on the frontend.
 *   4. Return a safe order summary (last 4 of card only — full number is
 *      never stored or returned).
 *
 * This layer knows nothing about HTTP — no req, no res, no status codes.
 *
 * Request lifecycle position:
 *   POST /api/checkout
 *     → [validateCheckoutBody]
 *     → [checkoutController]
 *     → [checkoutService ← YOU ARE HERE]
 *          ↓
 *     [data/json/orders.json]  (read → append → write)
 */

const fs   = require('fs');
const path = require('path');

const ORDERS_PATH = path.resolve(__dirname, '../../data/json/orders.json');

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * loadOrders — reads and parses orders.json.
 * Returns an empty array if the file is missing or unparseable (graceful start).
 * @returns {Array<Object>}
 */
function loadOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * saveOrders — serialises and writes the full order array back to disk.
 * @param {Array<Object>} orders
 */
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf8');
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * placeOrder
 *
 * Calculates the total, builds an order record, and persists it.
 * The full card number is NEVER stored — only the last 4 digits.
 *
 * @param {Array<{id:number,name:string,price:number,quantity:number}>} cart
 *   — already validated by the Gatekeeper middleware
 * @param {string} email      — already normalised (lowercase, trimmed)
 * @param {string} cardNumber — already normalised to 16 raw digits
 * @returns {Promise<{ order: { id, total, cardLast4, status, placedAt } }>}
 * @throws {Error} with code 'SAVE_FAILED' when the JSON file cannot be written
 */
async function placeOrder(cart, email, cardNumber) {
  // ── Step 1: calculate order total ─────────────────────────────────────────
  // Each item carries its own price snapshot so the total is locked at the
  // moment of purchase even if product prices change later.
  const total = parseFloat(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  // ── Step 2: load existing orders and assign next ID ───────────────────────
  const orders = loadOrders();
  const nextId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1;

  // ── Step 3: build order record ────────────────────────────────────────────
  const order = {
    id:        nextId,
    email,
    cardLast4: cardNumber.slice(-4),   // ONLY the last 4 digits — PCI DSS hygiene
    cart:      cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
    total,
    status:    'confirmed',
    placedAt:  new Date().toISOString(),
  };

  // ── Step 4: try to persist ────────────────────────────────────────────────
  // Wrapped in try…catch so that a write failure (disk full, permission error)
  // propagates as a typed domain error — not a raw Node.js ENOENT/EACCES.
  // The controller maps SAVE_FAILED → 400 so the frontend NEVER clears the cart.
  orders.push(order);
  try {
    saveOrders(orders);
  } catch (ioErr) {
    const err  = new Error('Failed to persist order.');
    err.code   = 'SAVE_FAILED';
    err.cause  = ioErr;
    throw err;
  }

  // ── Step 5: return safe summary ───────────────────────────────────────────
  return {
    order: {
      id:        order.id,
      total:     order.total,
      cardLast4: order.cardLast4,
      status:    order.status,
      placedAt:  order.placedAt,
    },
  };
}

module.exports = { placeOrder };
