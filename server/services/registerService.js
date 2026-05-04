/**
 * services/registerService.js
 *
 * Handles all registration business logic:
 *   1. Load the current user database from disk.
 *   2. Check for a duplicate email (conflict → throw).
 *   3. Hash the plaintext password with bcrypt.
 *   4. Build a new user record and append it to the JSON file.
 *   5. Return a safe subset of the new user (never the hash).
 *
 * This layer knows nothing about HTTP — no req, no res, no status codes.
 *
 * Why JSON file as DB?
 *   Suitable for a mock/learning context. In production, replace
 *   loadUsers() / saveUsers() with real DB calls (e.g. Prisma, Mongoose).
 *   Only THIS file changes when you swap the data layer.
 *
 * Request lifecycle position:
 *   POST /api/register
 *     → [validateRegisterBody]
 *     → [registerController]
 *     → [registerService ← YOU ARE HERE]
 *          ↓
 *     [data/json/users.json]  (read → check → write)
 */

const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;
const USERS_PATH  = path.resolve(__dirname, '../../data/json/users.json');

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * loadUsers — reads and parses users.json.
 * @returns {Array<Object>}
 */
function loadUsers() {
  const raw = fs.readFileSync(USERS_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * saveUsers — serialises and writes the full user array back to disk.
 * Uses a 2-space indent so the file remains human-readable.
 * @param {Array<Object>} users
 */
function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * NewUserResult
 * @typedef {{ user: { id: number, firstName: string, email: string, registeredAt: string } }} NewUserResult
 */

/**
 * registerUser
 *
 * Creates a new user account.
 *
 * @param {string} firstName  — already trimmed by middleware
 * @param {string} email      — already lowercased + trimmed by middleware
 * @param {string} password   — plaintext; hashed here, never stored raw
 * @returns {Promise<NewUserResult>}
 * @throws {Error} with code 'EMAIL_TAKEN'   when the email is already registered
 * @throws {Error} with code 'WRITE_FAILED'  when the JSON file cannot be saved
 */
async function registerUser(firstName, email, password) {
  const users = loadUsers();

  // ── Step 1: duplicate email check ─────────────────────────────────────────
  // Case-insensitive comparison (email already lowercased by middleware, but
  // stored records may have mixed case from the seed data).
  const exists = users.some((u) => u.username.toLowerCase() === email);
  if (exists) {
    const err  = new Error('Email is already registered.');
    err.code   = 'EMAIL_TAKEN';
    throw err;
  }

  // ── Step 2: hash the password ─────────────────────────────────────────────
  // bcrypt.hash is async — it runs in libuv's thread pool so it doesn't block
  // the Node.js event loop during the expensive key-stretching computation.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // ── Step 3: build the new user record ─────────────────────────────────────
  // Auto-increment ID: find the current max and add 1.
  // In production use a DB sequence or UUID instead.
  const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

  const newUser = {
    id:           nextId,
    firstName,
    username:     email,          // field name matches the existing seed data
    passwordHash,
    registeredAt: new Date().toISOString().slice(0, 10),  // "YYYY-MM-DD"
  };

  // ── Step 4: persist ───────────────────────────────────────────────────────
  users.push(newUser);
  try {
    saveUsers(users);
  } catch (ioErr) {
    // Wrap the I/O error with a domain-specific code so the controller can
    // return an appropriate HTTP status without inspecting raw Node errors.
    const err  = new Error('Failed to persist new user.');
    err.code   = 'WRITE_FAILED';
    err.cause  = ioErr;
    throw err;
  }

  // ── Step 5: return a safe subset — NEVER include the hash ─────────────────
  return {
    user: {
      id:           newUser.id,
      firstName:    newUser.firstName,
      email:        newUser.username,
      registeredAt: newUser.registeredAt,
    },
  };
}

module.exports = { registerUser };
