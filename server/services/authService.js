/**
 * services/authService.js
 *
 * Handles all authentication business logic:
 *   1. Look up a user by email in the local JSON database.
 *   2. Compare the submitted plaintext password against the stored bcrypt hash.
 *   3. Sign and return a JWT if credentials are valid.
 *
 * This layer knows NOTHING about HTTP — no req, no res, no status codes.
 * It receives plain strings, does work, and either returns data or throws.
 *
 * Why bcrypt over MD5?
 *   MD5 is a fast cryptographic digest — it was never designed for passwords.
 *   An attacker with a GPU can crack billions of MD5 hashes per second using
 *   rainbow tables or brute force. bcrypt is intentionally slow (work factor
 *   controlled by SALT_ROUNDS) and embeds a unique salt in every hash, making
 *   rainbow tables useless and brute-force extremely expensive.
 *
 * Request lifecycle position:
 *   POST /api/login
 *     → [validateLoginBody]
 *     → [loginController]
 *     → [authService ← YOU ARE HERE]
 *          ↓
 *     [data/json/users.json]  (read once, held in memory)
 *          ↓
 *     bcrypt.compare()
 *          ↓
 *     jwt.sign()
 */

const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

// ── Configuration ──────────────────────────────────────────────────────────

/** In production this MUST live in an environment variable, never in code. */
const JWT_SECRET = process.env.JWT_SECRET || 'stylish-dev-secret-change-me-in-prod';

/** Token validity window.  15 minutes is a common short-lived access token. */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

/** Path to our mock user database. */
const USERS_PATH = path.resolve(__dirname, '../../data/json/users.json');

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * loadUsers
 *
 * Reads users.json once and parses it.  The result is not cached here so
 * that edits to the file are picked up on the next request (useful during
 * development).  In production you would cache or use a real DB.
 *
 * @returns {Array<Object>}
 */
function loadUsers() {
  const raw = fs.readFileSync(USERS_PATH, 'utf8');
  return JSON.parse(raw);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * AuthResult
 * @typedef {{ token: string, user: { id: number, firstName: string, email: string } }} AuthResult
 */

/**
 * attemptLogin
 *
 * Tries to authenticate a user with the supplied credentials.
 *
 * SECURITY — constant-time behaviour:
 *   Even when the email does NOT exist we still call bcrypt.compare() against
 *   a dummy hash.  Without this, an attacker could detect valid emails by
 *   timing the response (email-not-found returns instantly; bcrypt compare
 *   takes ~100 ms).  The dummy compare makes both paths take the same time.
 *
 * @param {string} email      — already lowercased by the middleware
 * @param {string} password   — plaintext submitted by the client
 * @returns {Promise<AuthResult>}
 * @throws {Error} with code 'INVALID_CREDENTIALS' when login should fail
 */
async function attemptLogin(email, password) {
  const users = loadUsers();

  // Look up the user.  We search case-insensitively even though the middleware
  // already lowercased `email`, because the stored usernames might have mixed
  // case in the JSON.
  const user = users.find(
    (u) => u.username.toLowerCase() === email
  );

  // ── Constant-time guard ──────────────────────────────────────────────────
  // Whether the user exists or not, we always do a bcrypt comparison.
  // If the user doesn't exist we compare against a dummy hash so the
  // response time is indistinguishable from a wrong-password attempt.
  const DUMMY_HASH = '$2b$12$invalidhashusedtomaintaintimingXXXXXXXXXXXXXXXXXXXXXXX';
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;

  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  // ── Fail path ─────────────────────────────────────────────────────────────
  // We intentionally collapse "email not found" and "wrong password" into a
  // single error code so the controller can return one generic message —
  // preventing user-enumeration attacks.
  if (!user || !passwordMatch) {
    const err = new Error('Invalid credentials');
    err.code  = 'INVALID_CREDENTIALS';
    throw err;
  }

  // ── Success path: sign a JWT ──────────────────────────────────────────────
  // The token payload carries only non-sensitive identifiers.
  // NEVER embed the password hash, full address, or payment info in a JWT.
  const payload = {
    sub:       user.id,         // "subject" — standard JWT claim
    firstName: user.firstName,
    email:     user.username,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });

  return {
    token,
    user: {
      id:        user.id,
      firstName: user.firstName,
      email:     user.username,
    },
  };
}

module.exports = { attemptLogin };
