/**
 * controllers/productsController.js
 *
 * The Controller layer is the bridge between HTTP and business logic.
 * It:
 *   1. Extracts what it needs from the validated request (req.query).
 *   2. Calls the Service with clean arguments.
 *   3. Packages the Service's result into a standardised HTTP response.
 *   4. Catches any unexpected errors and converts them to 500 responses.
 *
 * It does NOT contain data-access code (that lives in the Service) and it
 * does NOT contain validation code (that lives in the Gatekeeper middleware).
 *
 * Request lifecycle position:
 *   [Client] → [Router] → [Gatekeeper] → [Controller ← YOU ARE HERE] → [Service]
 */

const { getProducts } = require('../services/productsService');

/**
 * listProducts
 *
 * Handles: GET /api/products?category=<optional>
 *
 * Happy path  → 200 OK   with { success, data, meta }
 * Error path  → 500 ISE  with { success, error }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function listProducts(req, res) {
  // ── Step 1: extract input ─────────────────────────────────────────────────
  // `category` is either a normalised string (e.g. "Running") or undefined.
  // The Gatekeeper already validated and normalised it, so we trust it here.
  const { category } = req.query;

  try {
    // ── Step 2: delegate to the Service ────────────────────────────────────
    // The controller doesn't know how products are stored — it just asks for
    // them. If storage changes (e.g. Postgres instead of JSON), only the
    // service changes.
    const result = await getProducts(category);

    // ── Step 3: package and return a 200 OK response ───────────────────────
    // Standardised envelope keeps the API contract consistent across all
    // endpoints: { success, data, meta }.
    return res.status(200).json({
      success: true,
      data: result.products,
      meta: {
        total:    result.total,
        category: result.category ?? 'all',  // null → "all" for readability
        // Include the full list of valid categories so clients can build
        // filter UI without a separate round-trip.
        availableCategories: ['Casual', 'Formal', 'Hiking', 'Running', 'Sneakers', 'Training'],
      },
    });

  } catch (err) {
    // ── Step 4: handle unexpected errors ────────────────────────────────────
    // This catches file I/O errors, JSON parse errors, or any other surprise
    // thrown by the service.  We log the full error server-side but return
    // only a safe, generic message to the client.
    console.error('[productsController] Unexpected error:', err);

    return res.status(500).json({
      success: false,
      error:   'An internal server error occurred. Please try again later.',
    });
  }
}

module.exports = { listProducts };
