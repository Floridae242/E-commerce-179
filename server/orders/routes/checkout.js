/**
 * routes/checkout.js
 *
 * Declares the POST / pipeline for /api/checkout:
 *   [Gatekeeper middleware] → [Controller]
 *
 * The router owns ONLY the URL-to-handler mapping and the per-route
 * middleware stack. No business logic lives here.
 *
 * Mounted in app.js as:
 *   app.use('/api/checkout', checkoutRoute);
 *
 * Full path:
 *   POST /api/checkout → validateCheckoutBody → checkout
 */

const { Router } = require('express');
const { validateCheckoutBody } = require('../middleware/validateCheckoutBody');
const { checkout }             = require('../controllers/checkoutController');

const router = Router();

/**
 * POST /api/checkout
 *
 * Body (JSON):
 *   { cart: [{id, name, price, quantity}], email, cardNumber }
 *
 * Success  200: { success, message, order: {id, total, cardLast4, status, placedAt} }
 * Error    400: { success: false, field, error }   (validation OR save failure)
 * Error    500: { success: false, error }           (unexpected)
 */
router.post('/', validateCheckoutBody, checkout);

module.exports = router;
