/**
 * config.js — single source of truth for environment-driven settings.
 *
 * Loads .env from the project root, validates that every required variable
 * is present, and crashes loudly if anything is missing (the "Zero-Config"
 * test from the Go-Live Audit: the app must NOT silently boot with a default
 * secret in production).
 */

const path = require('path');

// Load .env from the project root (one level above /server)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['JWT_SECRET', 'DB_PATH'];

const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k].trim() === '');
if (missing.length > 0) {
  console.error(
    `\n[config] Missing required environment variable(s): ${missing.join(', ')}\n` +
    `         Copy .env.example → .env and fill in the values.\n`
  );
  process.exit(1);
}

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  NODE_ENV,
  IS_PROD:        NODE_ENV === 'production',
  PORT:           Number(process.env.PORT) || 3000,
  JWT_SECRET:     process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  DB_PATH:        path.resolve(__dirname, '../../', process.env.DB_PATH),
};
