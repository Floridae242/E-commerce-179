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
const { IS_PROD }   = require('./shared/config');
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

// Parse JSON request bodies — body size capped at 10kb so a malicious client
// can't crash the server with a 1GB string (Audit slide 7: Input Gatekeeper).
app.use(express.json({ limit: '10kb' }));

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
// "Two-Face" pattern (Audit slide 5):
//   Internal → log the full error with stack trace for the developer.
//   External → in production, send only a generic 500 so the stack trace
//              isn't leaked to attackers. In development, return the detail
//              to make debugging fast.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[global error handler]', err);

  // express.json() body-too-large maps to 413, not 500
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error:   'Request body too large (max 10kb).',
    });
  }

  const status = err.status || err.statusCode || 500;

  if (IS_PROD) {
    return res.status(status).json({
      success: false,
      error:   'Internal server error.',
    });
  }

  return res.status(status).json({
    success: false,
    error:   err.message || 'Internal server error.',
    stack:   err.stack,
  });
});

module.exports = app;
