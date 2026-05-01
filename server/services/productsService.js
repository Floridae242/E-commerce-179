/**
 * services/productsService.js
 *
 * The Service layer is responsible for ALL data-access and business logic.
 * It knows nothing about HTTP — no req, no res, no status codes. It just
 * receives plain arguments, does work, and returns plain data (or throws).
 *
 * This separation means you could swap Express for Fastify, or swap the
 * JSON file for a database, and only this file needs to change.
 *
 * Request lifecycle position:
 *   [Client] → [Router] → [Gatekeeper] → [Controller] → [Service ← YOU ARE HERE]
 *                                                              ↓
 *                                                       [data/json/products.json]
 */

const fs   = require('fs');
const path = require('path');

/** Absolute path to the data file — resolved once at module load time so
 *  every call to getProducts() skips the path-resolution step. */
const DATA_PATH = path.resolve(__dirname, '../../data/json/products.json');

/**
 * loadProducts
 *
 * Reads and parses products.json from disk synchronously.
 * Kept as a private helper so the caching strategy can be changed in one
 * place without touching any public API.
 *
 * Throws if the file is missing or contains invalid JSON — the controller
 * catches this and converts it into a 500 response.
 *
 * @returns {Array<Object>} raw product array
 */
function loadProducts() {
  // fs.readFileSync throws ENOENT if the file doesn't exist.
  const raw = fs.readFileSync(DATA_PATH, 'utf8');

  // JSON.parse throws SyntaxError if the file content is malformed.
  return JSON.parse(raw);
}

/**
 * getProducts
 *
 * Public API of this service.  Returns either all products or only those
 * belonging to the requested category.
 *
 * @param {string|undefined} category  — already validated & normalised by the
 *                                       Gatekeeper middleware; may be undefined.
 * @returns {{ products: Array<Object>, total: number, category: string|null }}
 */
function getProducts(category) {
  const all = loadProducts();

  // When no category is requested, return the full catalogue.
  if (!category) {
    return {
      products: all,
      total:    all.length,
      category: null,
    };
  }

  // Filter is a simple equality check because the Gatekeeper already
  // normalised casing, so "Running" === "Running" is guaranteed.
  const filtered = all.filter((p) => p.category === category);

  return {
    products: filtered,
    total:    filtered.length,
    category,
  };
}

module.exports = { getProducts };
