/**
 * server.js — HTTP server bootstrap
 *
 * Kept separate from app.js so the Express app can be imported and tested
 * without actually binding to a port (a common pattern for Jest/Supertest).
 *
 * NOTE: config is required FIRST so the dotenv guard runs before any other
 * module tries to read process.env. If a required variable is missing, the
 * process exits here — no half-booted server, no silent default secret.
 */

const { PORT, NODE_ENV } = require('./shared/config');
const app = require('./app');

app.listen(PORT, () => {
  console.log(`Stylish API running in ${NODE_ENV} mode → http://localhost:${PORT}`);
  console.log(`  GET /api/products`);
  console.log(`  GET /api/products?category=Running`);
});
