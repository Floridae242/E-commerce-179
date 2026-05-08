/**
 * routes/auth.js
 *
 * Declares the authentication route pipeline.
 * Contains zero business logic — it only wires up the URL, method,
 * middleware, and controller handler.
 *
 * Full request lifecycle for POST /api/login:
 *
 *   [Client sends { email, password }]
 *          │
 *          ▼
 *   [Express Router]              ← this file
 *          │
 *          ▼
 *   [validateLoginBody]           ← Gatekeeper: checks body shape & types
 *          │  400 if invalid      (controller never runs on bad structure)
 *          ▼
 *   [login controller]            ← extracts fields, calls service, sends res
 *          │
 *          ▼
 *   [attemptLogin service]        ← DB lookup → bcrypt.compare → jwt.sign
 *          │
 *          ├─ credentials bad  →  throws INVALID_CREDENTIALS
 *          │       ↓
 *          │  [controller] → 401 "Invalid email or password."
 *          │
 *          └─ credentials OK   →  returns { token, user }
 *                  ↓
 *             [controller] → 200 { success, token, user }
 */

const { Router }             = require('express');
const { validateLoginBody }  = require('../middleware/validateLoginBody');
const { login }              = require('../controllers/authController');

const router = Router();

/**
 * POST /api/login
 *
 * Body (JSON):
 *   email    {string} — registered user email
 *   password {string} — plaintext password
 *
 * Success  200 { success: true, token, user: { id, firstName, email } }
 * Fail     401 { success: false, error: "Invalid email or password." }
 * Bad body 400 { success: false, error: "<field> is required." }
 * Server   500 { success: false, error: "An internal server error occurred." }
 */
router.post('/', validateLoginBody, login);

module.exports = router;
