/**
 * controllers/authController.js
 *
 * Bridges the HTTP layer and the auth service for the login endpoint.
 *
 * Responsibilities:
 *   1. Extract validated credentials from req.body.
 *   2. Call attemptLogin() in the service.
 *   3. Return a standardised success or error response.
 *   4. Guarantee that NO sensitive information leaks in error responses.
 *
 * ── Critical security note: generic error messaging ──────────────────────
 *   A naive implementation might return different messages for
 *   "email not found" vs "wrong password".  This lets an attacker probe
 *   your database to enumerate valid accounts (user-enumeration attack).
 *
 *   This controller ALWAYS returns the same message for any credential
 *   failure: "Invalid email or password."  The distinction is handled
 *   internally by the service (and logged server-side if needed) but is
 *   NEVER exposed to the client.
 *
 * Request lifecycle position:
 *   POST /api/login
 *     → [validateLoginBody]
 *     → [loginController ← YOU ARE HERE]
 *     → [authService]
 */

const { attemptLogin } = require('../services/authService');

/**
 * login
 *
 * Handles: POST /api/login
 * Body:    { email: string, password: string }
 *
 * Responses:
 *   200 { success: true,  token, user: { id, firstName, email } }
 *   400 { success: false, error }   — caught upstream by validateLoginBody
 *   401 { success: false, error }   — invalid credentials
 *   500 { success: false, error }   — unexpected server failure
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function login(req, res) {
  // ── Step 1: extract (already validated + normalised by middleware) ─────────
  const { email, password } = req.body;

  try {
    // ── Step 2: delegate to the service ────────────────────────────────────
    const { token, user } = await attemptLogin(email, password);

    // ── Step 3: 200 OK — credentials valid, token issued ───────────────────
    return res.status(200).json({
      success: true,
      token,
      user,   // safe subset: id, firstName, email — no hash, no internals
    });

  } catch (err) {
    // ── Step 4: distinguish credential failure from unexpected errors ───────

    if (err.code === 'INVALID_CREDENTIALS') {
      // 401 Unauthorized — intentionally vague message to prevent user-enumeration.
      // Whether the email doesn't exist OR the password is wrong, the client
      // sees the same response.  An attacker learns nothing useful.
      return res.status(401).json({
        success: false,
        error:   'Invalid email or password.',   // ← never changes, never specifies which
      });
    }

    // Any other error (file I/O, JSON parse, jwt.sign failure) is unexpected.
    // Log the real error server-side but return only a safe generic message.
    console.error('[authController] Unexpected error during login:', err);

    return res.status(500).json({
      success: false,
      error:   'An internal server error occurred. Please try again later.',
    });
  }
}

module.exports = { login };
