/**
 * services/registerService.js
 *
 * User registration business logic — now backed by SQLite (store.db).
 * Replaces the previous fs.readFileSync / fs.writeFileSync pattern.
 *
 * What changed vs. the JSON version:
 *   BEFORE: loadUsers() → check duplicate → push → saveUsers() (full-file rewrite)
 *   AFTER:  INSERT INTO users … (atomic, crash-safe, no full-file rewrite)
 *           SQLITE_CONSTRAINT_UNIQUE handles the duplicate-email race condition
 *           that the JSON approach could not.
 *
 * Request lifecycle position:
 *   POST /api/register
 *     → [validateRegisterBody]
 *     → [registerController]
 *     → [registerService ← YOU ARE HERE]
 *          ↓
 *     [store.db → users table]
 */

const bcrypt = require('bcrypt');
const db     = require('../db');

const SALT_ROUNDS = 12;

// Prepared statement (compiled once, reused on every registration)
const insertUser = db.prepare(
  'INSERT INTO users (first_name, email, password_hash, registered_at) VALUES (?, ?, ?, ?)'
);

/**
 * registerUser
 *
 * @param {string} firstName — trimmed by Gatekeeper
 * @param {string} email     — lowercased + trimmed by Gatekeeper
 * @param {string} password  — plaintext; hashed here, never stored raw
 * @returns {Promise<{ user: { id, firstName, email, registeredAt } }>}
 * @throws {Error} code 'EMAIL_TAKEN'   — email already in users table
 * @throws {Error} code 'WRITE_FAILED'  — unexpected DB error
 */
async function registerUser(firstName, email, password) {
  // Hash is async — runs in libuv thread pool, doesn't block the event loop
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const registeredAt = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  let info;
  try {
    // The UNIQUE constraint on `email` guarantees atomicity:
    // if two requests race with the same email, only one INSERT succeeds.
    info = insertUser.run(firstName, email, passwordHash, registeredAt);
  } catch (dbErr) {
    if (dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        (dbErr.message && dbErr.message.includes('UNIQUE constraint failed'))) {
      const err  = new Error('Email is already registered.');
      err.code   = 'EMAIL_TAKEN';
      throw err;
    }
    const err  = new Error('Failed to persist new user.');
    err.code   = 'WRITE_FAILED';
    err.cause  = dbErr;
    throw err;
  }

  return {
    user: {
      id:           info.lastInsertRowid,
      firstName,
      email,
      registeredAt,
    },
  };
}

module.exports = { registerUser };
