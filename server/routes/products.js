/**
 * routes/products.js
 *
 * The Route layer wires together URLs, HTTP methods, middleware, and
 * controllers.  It contains zero business logic — its only job is to
 * declare the "pipeline" that each request must travel through.
 *
 * Request lifecycle (full picture):
 *
 *   GET /api/products?category=Running
 *          │
 *          ▼
 *   [Express Router]          ← this file defines the route
 *          │
 *          ▼
 *   [validateProductsQuery]   ← Gatekeeper: rejects bad input early
 *          │  (calls next() only when query is valid)
 *          ▼
 *   [listProducts controller] ← extracts input, calls service, sends response
 *          │
 *          ▼
 *   [getProducts service]     ← reads JSON, filters, returns data
 *          │
 *          ▼
 *   [Controller sends res]    ← 200 OK { success, data, meta }
 *                                 or 500 ISE { success, error }
 *
 * Gatekeeper short-circuit (bad input):
 *
 *   GET /api/products?category=Hat
 *          │
 *          ▼
 *   [validateProductsQuery]   ← rejects, sends 400 { success, error }
 *          ✗ (controller never runs)
 */

const { Router }                = require('express');
const { validateProductsQuery } = require('../middleware/validateQuery');
const { listProducts }          = require('../controllers/productsController');

const router = Router();

/**
 * GET /api/products
 *
 * Query params:
 *   category (optional) — one of: Casual, Formal, Hiking, Running, Sneakers, Training
 *
 * Responses:
 *   200 { success: true,  data: Product[], meta: { total, category, availableCategories } }
 *   400 { success: false, error: string }   — invalid / unknown query param
 *   500 { success: false, error: string }   — unexpected server error
 *
 * The middleware array [validateProductsQuery, listProducts] is Express's
 * "pipeline" syntax — each function runs in order, and each must either
 * call next() to proceed or send a response to stop the chain.
 */
router.get('/', validateProductsQuery, listProducts);

module.exports = router;
