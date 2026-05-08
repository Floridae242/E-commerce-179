/**
 * services/authService.js
 *
 * Authentication business logic — now backed by SQLite (store.db).
 * Replaces the previous fs.readFileSync(users.json) approach.
 *
 * What changed vs. the JSON version:
 *   BEFORE: loadUsers() reads the entire JSON file, then Array.find()
 *   AFTER:  db.prepare('SELECT … WHERE email = ?').get(email)
 *           — one indexed row lookup, no full-file read
 *
 * Everything else (bcrypt constant-time guard, JWT signing, error codes)
 * is unchanged — the HTTP layer never knew about the storage format.
 *
 * Request lifecycle position:
 *   POST /api/login
 *     → [validateLoginBody]
 *     → [authController]
 *     → [authService ← YOU ARE HERE]
 *          ↓
 *     [store.db → users table]
 *          ↓
 *     bcrypt.compare()  →  jwt.sign()
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../../shared/db');

// ── Configuration ──────────────────────────────────────────────────────────
const JWT_SECRET     = process.env.JWT_SECRET     || 'stylish-dev-secret-change-me-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// ── Statements (prepared once, reused on every call) ──────────────────────
const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * attemptLogin
 *
 * Constant-time behaviour is preserved:
 *   If the email doesn't exist we still run bcrypt.compare() against a
 *   dummy hash so response time is the same whether the email is wrong
 *   or the password is wrong — prevents user-enumeration timing attacks.
 *
 * @param {string} email    — lowercased by Gatekeeper middleware
 * @param {string} password — plaintext from client
 * @returns {Promise<{ token: string, user: { id, firstName, email } }>}
 * @throws {Error} code 'INVALID_CREDENTIALS'
 */
async function attemptLogin(email, password) {
  // Single indexed lookup — much faster than scanning a JSON array
  const user = findUserByEmail.get(email);

  // Constant-time guard: always run bcrypt even for unknown emails
  const DUMMY_HASH = '$2b$12$invalidhashusedtomaintaintimingXXXXXXXXXXXXXXXXXXXXXXX';
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;

  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    const err  = new Error('Invalid credentials');
    err.code   = 'INVALID_CREDENTIALS';
    throw err;
  }

  // JWT payload — non-sensitive fields only
  const token = jwt.sign(
    { sub: user.id, firstName: user.first_name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );

  return {
    token,
    user: { id: user.id, firstName: user.first_name, email: user.email },
  };
}

module.exports = { attemptLogin };
