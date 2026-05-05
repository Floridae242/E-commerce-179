/**
 * controllers/checkoutController.js — Checkout HTTP bridge
 *
 * Responsibilities:
 *   - Extract validated fields from req.body (Gatekeeper already ran).
 *   - Delegate all business logic to checkoutService.placeOrder().
 *   - Map service-layer error codes to HTTP status codes and response shapes.
 *   - Never perform validation or business logic directly here.
 *
 * Error mapping:
 *   SAVE_FAILED → 400  (order could not be saved; cart must NOT be cleared)
 *   unexpected  → 500
 *
 * Request lifecycle position:
 *   POST /api/checkout
 *     → [validateCheckoutBody]
 *     → [checkoutController ← YOU ARE HERE]
 *     → [checkoutService]
 */

const { placeOrder } = require('../services/checkoutService');

/**
 * checkout
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function checkout(req, res) {
  const { cart, email, cardNumber } = req.body;

  try {
    const result = await placeOrder(cart, email, cardNumber);
    const { order } = result;

    return res.status(200).json({
      success: true,
      message: `Order #${order.id} confirmed — thank you! Total charged: $${order.total.toFixed(2)} to card ending ****${order.cardLast4}.`,
      order,
    });

  } catch (err) {
    if (err.code === 'SAVE_FAILED') {
      // The order could not be written to disk.
      // Return 400 so the frontend DOES NOT clear the user's cart.
      return res.status(400).json({
        success: false,
        field:   'order',
        error:   'We could not save your order due to a server error. Your cart has been kept — please try again.',
      });
    }

    console.error('[checkoutController] unexpected error:', err);
    return res.status(500).json({
      success: false,
      error:   'An internal server error occurred.',
    });
  }
}

module.exports = { checkout };
