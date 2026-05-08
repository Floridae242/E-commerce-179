/**
 * services/checkoutService.js
 *
 * Checkout business logic — now backed by SQLite (store.db).
 * Replaces the previous loadOrders / saveOrders (full-file rewrite) approach.
 *
 * What changed vs. the JSON version:
 *   BEFORE: read orders.json → push → write entire file back (not atomic)
 *   AFTER:  db.transaction() wraps the INSERT into orders + INSERT into
 *           order_items as a single atomic unit — either both succeed or
 *           neither does.  This is the "All-or-Nothing" critical path from
 *           the course material.
 *
 * ERD mapping (Session 8 "Architecting the Schema"):
 *   orders      → id, user_id(FK→users), email, card_last4, total, status, placed_at
 *   order_items → id, order_id(FK→orders), product_id(FK→products), quantity, price
 *
 * Request lifecycle position:
 *   POST /api/checkout
 *     → [validateCheckoutBody]
 *     → [checkoutController]
 *     → [checkoutService ← YOU ARE HERE]
 *          ↓
 *     [store.db → orders + order_items tables]
 */

const db = require('../../shared/db');

// ── Prepared statements ────────────────────────────────────────────────────
const findUserByEmail = db.prepare('SELECT id FROM users WHERE email = ?');

const insertOrder = db.prepare(`
  INSERT INTO orders (user_id, email, card_last4, total, status, placed_at)
  VALUES (?, ?, ?, ?, 'confirmed', ?)
`);

const insertOrderItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, quantity, price)
  VALUES (?, ?, ?, ?)
`);

// ── Atomic transaction ────────────────────────────────────────────────────
// better-sqlite3 transactions run synchronously inside a single SQLite
// write lock — if any statement throws, the whole transaction rolls back.
const placeOrderTransaction = db.transaction((userId, email, cardLast4, total, placedAt, cart) => {
  const orderInfo = insertOrder.run(userId, email, cardLast4, total, placedAt);
  const orderId   = orderInfo.lastInsertRowid;

  for (const item of cart) {
    insertOrderItem.run(orderId, item.id, item.quantity, item.price);
  }

  return orderId;
});

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * placeOrder
 *
 * @param {Array<{id,name,price,quantity}>} cart — validated by Gatekeeper
 * @param {string} email      — normalised (lowercase, trimmed)
 * @param {string} cardNumber — 16 raw digits; only last 4 stored
 * @returns {{ order: { id, total, cardLast4, status, placedAt } }}
 * @throws {Error} code 'SAVE_FAILED' — DB write failed (cart must NOT be cleared)
 */
async function placeOrder(cart, email, cardNumber) {
  // ── Step 1: calculate total ───────────────────────────────────────────────
  const total = parseFloat(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  // ── Step 2: resolve user_id (nullable — guests have no account) ───────────
  const userRow = findUserByEmail.get(email);
  const userId  = userRow ? userRow.id : null;

  const cardLast4 = cardNumber.slice(-4);
  const placedAt  = new Date().toISOString();

  // ── Step 3: atomic INSERT (orders header + all line items) ────────────────
  let orderId;
  try {
    orderId = placeOrderTransaction(userId, email, cardLast4, total, placedAt, cart);
  } catch (dbErr) {
    const err  = new Error('Failed to persist order.');
    err.code   = 'SAVE_FAILED';
    err.cause  = dbErr;
    throw err;
  }

  return {
    order: { id: orderId, total, cardLast4, status: 'confirmed', placedAt },
  };
}

module.exports = { placeOrder };
