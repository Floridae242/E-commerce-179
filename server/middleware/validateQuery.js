/**
 * middleware/validateQuery.js — "Gatekeeper"
 *
 * This middleware runs BEFORE the controller. Its only job is to decide
 * whether an incoming request is valid enough to proceed. If not, it
 * short-circuits the request lifecycle and returns an error immediately,
 * so the controller and service never have to deal with bad input.
 *
 * Request lifecycle position:
 *   [Client] → [Router] → [Gatekeeper ← YOU ARE HERE] → [Controller] → [Service]
 */

/** All categories that exist in the data source. Kept here as the single
 *  source of truth so validation and error messages stay in sync. */
const VALID_CATEGORIES = ['Casual', 'Formal', 'Hiking', 'Running', 'Sneakers', 'Training'];

/**
 * validateProductsQuery
 *
 * Rules enforced:
 *  1. `category` is optional — omitting it returns all products.
 *  2. When supplied, `category` must be a non-empty string.
 *  3. When supplied, `category` must match one of the known values
 *     (case-insensitive, so "running" is accepted as "Running").
 *  4. No unknown query parameters are allowed — helps prevent probing.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateProductsQuery(req, res, next) {
  const { category, ...rest } = req.query;

  // ── Rule 4: reject unexpected query keys ──────────────────────────────────
  const unknownKeys = Object.keys(rest);
  if (unknownKeys.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Unknown query parameter(s): ${unknownKeys.join(', ')}. Accepted: category`,
    });
  }

  // ── Rule 2: category, when present, must be a non-empty string ────────────
  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '`category` must be a non-empty string.',
      });
    }

    // ── Rule 3: category must be a known value (case-insensitive match) ──────
    const normalised = category.trim();
    const matched = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === normalised.toLowerCase()
    );

    if (!matched) {
      return res.status(400).json({
        success: false,
        error: `Unknown category "${normalised}". Valid options: ${VALID_CATEGORIES.join(', ')}.`,
      });
    }

    // Normalise the value in-place so the controller always sees a correctly
    // cased string ("running" → "Running"), regardless of what the client sent.
    req.query.category = matched;
  }

  // ── All rules passed — hand off to the controller ─────────────────────────
  next();
}

module.exports = { validateProductsQuery, VALID_CATEGORIES };
