/**
 * routes/register.js
 *
 * Declares the registration route pipeline.
 * Zero business logic — only wires the URL, method, middleware, and controller.
 *
 * Full request lifecycle for POST /api/register:
 *
 *   [Client sends { firstName, email, password, confirmPassword }]
 *          │
 *          ▼
 *   [Express Router]                  ← this file
 *          │
 *          ▼
 *   [validateRegisterBody]            ← Gatekeeper: shape, types, password strength
 *          │  400 if invalid          (controller never runs on bad structure)
 *          ▼
 *   [register controller]             ← extracts fields, calls service, sends res
 *          │
 *          ▼
 *   [registerUser service]            ← duplicate check → bcrypt.hash → JSON write
 *          │
 *          ├─ email taken   → throws EMAIL_TAKEN
 *          │       ↓
 *          │  [controller] → 409 "An account with that email address already exists."
 *          │
 *          ├─ write failed  → throws WRITE_FAILED
 *          │       ↓
 *          │  [controller] → 500 "Failed to create account…"
 *          │
 *          └─ success       → returns { user }
 *                  ↓
 *             [controller] → 201 { success, message, user }
 */

const { Router }               = require('express');
const { validateRegisterBody } = require('../middleware/validateRegisterBody');
const { register }             = require('../controllers/registerController');

const router = Router();

/**
 * POST /api/register
 *
 * Body (JSON):
 *   firstName       {string} — user's first name
 *   email           {string} — desired account email
 *   password        {string} — must meet strength requirements
 *   confirmPassword {string} — must match password
 *
 * Success  201 { success: true, message, user: { id, firstName, email, registeredAt } }
 * Conflict 409 { success: false, error: "An account with that email address already exists." }
 * Bad body 400 { success: false, error: "<specific field problem>" }
 * Server   500 { success: false, error: "…" }
 */
router.post('/', validateRegisterBody, register);

module.exports = router;
