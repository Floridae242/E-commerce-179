/**
 * server/db.js — SQLite connection, schema, and one-time seed
 *
 * Uses `better-sqlite3` (synchronous API) so every service can call
 * db.prepare().get() / .run() / .all() directly without async/await or
 * callback chains.
 *
 * ERD (mirrors the Session 8 "Architecting the Schema" activity):
 *
 *   USERS ──< ORDERS >── PRODUCTS   (orders is the junction / child table)
 *   ORDERS ──< ORDER_ITEMS          (one order → many line items)
 *
 *   users        : id, first_name, email, password_hash, registered_at
 *   products     : id, name, price, category, description, image_url
 *   orders       : id, user_id(FK), email, card_last4, total, status, placed_at
 *   order_items  : id, order_id(FK), product_id(FK), quantity, price
 *
 * First-run seeding:
 *   If `users`    is empty → import data/json/users.json    (10 bcrypt-hashed seed users)
 *   If `products` is empty → import data/json/products.json (20 shoe products)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// ── Open database file ────────────────────────────────────────────────────────
const DB_PATH = path.resolve(__dirname, '../data/store.db');

const db = new Database(DB_PATH);

// Performance & integrity pragmas
db.pragma('journal_mode = WAL');   // Write-Ahead Logging — better concurrent reads
db.pragma('foreign_keys = ON');    // Enforce FK constraints

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    registered_at TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    price       REAL    NOT NULL,
    category    TEXT,
    description TEXT,
    image_url   TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    email      TEXT NOT NULL,
    card_last4 TEXT NOT NULL,
    total      REAL NOT NULL,
    status     TEXT NOT NULL DEFAULT 'confirmed',
    placed_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    price      REAL    NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// ── One-time seed: users ──────────────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  const USERS_JSON = path.resolve(__dirname, '../data/json/users.json');
  try {
    const users = JSON.parse(fs.readFileSync(USERS_JSON, 'utf8'));
    const insertUser = db.prepare(
      'INSERT INTO users (id, first_name, email, password_hash, registered_at) VALUES (?, ?, ?, ?, ?)'
    );
    const seedUsers = db.transaction((rows) => {
      for (const u of rows) {
        insertUser.run(u.id, u.firstName, u.username, u.passwordHash, u.registeredAt);
      }
    });
    seedUsers(users);
    console.log(`[db] seeded ${users.length} users from users.json`);
  } catch (e) {
    console.warn('[db] could not seed users:', e.message);
  }
}

// ── One-time seed: products ───────────────────────────────────────────────────
const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (productCount === 0) {
  const PRODUCTS_JSON = path.resolve(__dirname, '../data/json/products.json');
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
    const insertProduct = db.prepare(
      'INSERT INTO products (id, name, price, category, description, image_url) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const seedProducts = db.transaction((rows) => {
      for (const p of rows) {
        insertProduct.run(p.id, p.name, p.price, p.category || null, p.description || null, p.image_url || null);
      }
    });
    seedProducts(products);
    console.log(`[db] seeded ${products.length} products from products.json`);
  } catch (e) {
    console.warn('[db] could not seed products:', e.message);
  }
}

module.exports = db;
