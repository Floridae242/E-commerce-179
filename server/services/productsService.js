/**
 * services/productsService.js
 *
 * The Service layer is responsible for ALL data-access and business logic.
 * It knows nothing about HTTP — no req, no res, no status codes. It just
 * receives plain arguments, does work, and returns plain data (or throws).
 *
 * What changed vs. the JSON version:
 *   BEFORE: fs.readFileSync(products.json) → JSON.parse → Array.filter()
 *   AFTER:  db.prepare('SELECT * FROM products WHERE category = ?').all(category)
 *           — one indexed query; no full-file read on every request.
 *
 * ERD mapping (Session 8 "Architecting the Schema"):
 *   products → id, name, price, category, description, image_url
 *
 * Request lifecycle position:
 *   [Client] → [Router] → [Gatekeeper] → [Controller] → [Service ← YOU ARE HERE]
 *                                                              ↓
 *                                                       [store.db → products table]
 */

const db = require('../db');

// ── Prepared statements (compiled once at module load, reused on every call) ──
const selectAll = db.prepare('SELECT * FROM products');
const selectByCategory = db.prepare('SELECT * FROM products WHERE category = ?');

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
  // When no category is requested, return the full catalogue.
  if (!category) {
    const all = selectAll.all();
    return {
      products: all,
      total:    all.length,
      category: null,
    };
  }

  // Parameterised query handles casing the same way the Gatekeeper normalised it.
  // SQLite returns rows as plain objects with snake_case keys matching the schema.
  const filtered = selectByCategory.all(category);

  return {
    products: filtered,
    total:    filtered.length,
    category,
  };
}

module.exports = { getProducts };
