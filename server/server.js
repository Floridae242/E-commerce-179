/**
 * server.js — HTTP server bootstrap
 *
 * Kept separate from app.js so the Express app can be imported and tested
 * without actually binding to a port (a common pattern for Jest/Supertest).
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Stylish API running → http://localhost:${PORT}`);
  console.log(`  GET /api/products`);
  console.log(`  GET /api/products?category=Running`);
});
