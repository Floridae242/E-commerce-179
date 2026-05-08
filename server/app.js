/**
 * app.js — Express application entry point
 *
 * Responsibilities:
 *   - Create and configure the Express app instance.
 *   - Mount global middleware (JSON parsing, CORS, request logging).
 *   - Mount route files under their base paths.
 *   - Export the app so it can be started by a separate server.js or tested
 *     without binding to a port.
 *
 * What lives here vs. elsewhere:
 *   app.js     → app wiring (middleware order, route mounting)
 *   routes/    → URL-to-handler mapping + middleware pipeline per route
 *   controllers/ → HTTP ↔ business-logic bridge
 *   services/  → data access and business logic
 *   middleware/ → reusable per-route middleware (validation, auth, etc.)
 */

const express       = require('express');
const path          = require('path');
// Domain-based route imports (Session 9 — Microservice folder structure)
const productsRoute  = require('./catalog/routes/products');   // Catalog domain
const authRoute      = require('./identity/routes/auth');       // Identity domain
const registerRoute  = require('./identity/routes/register');   // Identity domain
const checkoutRoute  = require('./orders/routes/checkout');     // Orders domain

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────

// CORS — allow any localhost origin (Live Server, Vite, etc.) to call the API
// during development. In production, replace with a strict allowlist.
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Parse JSON request bodies (not needed for GET-only routes but good practice
// for when POST/PUT routes are added later).
app.use(express.json());

// Simple request logger — replace with morgan or pino in production.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve the static frontend from the project root so the same Node process
// can host both the API and the HTML pages during development.
app.use(express.static(path.resolve(__dirname, '..')));

// ── Route mounting ────────────────────────────────────────────────────────────

// All requests to /api/products/* are handled by routes/products.js.
// The router inside that file only defines '/', so the full path is:
//   GET /api/products          → all products
//   GET /api/products?category=Running → filtered products
app.use('/api/products', productsRoute);
app.use('/api/login',    authRoute);
app.use('/api/register', registerRoute);
app.use('/api/checkout', checkoutRoute);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
// Must come AFTER all route mounts.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express recognises a 4-argument middleware as an error handler.
// Any error passed to next(err) lands here.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[global error handler]', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

module.exports = app;
