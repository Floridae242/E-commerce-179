/**
 * controllers/registerController.js
 *
 * Bridges the HTTP layer and the registration service.
 *
 * Responsibilities:
 *   1. Extract validated fields from req.body.
 *   2. Call registerUser() in the service.
 *   3. Map service results / errors to the correct HTTP status codes.
 *   4. Return a standardised JSON envelope.
 *
 * HTTP status map:
 *   201 Created        — account successfully created
 *   409 Conflict       — email already registered
 *   500 Internal Error — unexpected failure (I/O, bcrypt, etc.)
 *
 * Request lifecycle position:
 *   POST /api/register
 *     → [validateRegisterBody]
 *     → [registerController ← YOU ARE HERE]
 *     → [registerService]
 */

const { registerUser } = require('../services/registerService');

/**
 * register
 *
 * Handles: POST /api/register
 * Body:    { firstName, email, password, confirmPassword }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function register(req, res) {
  // ── Step 1: extract (already validated + normalised by middleware) ─────────
  const { firstName, email, password } = req.body;
  // `confirmPassword` is not passed to the service — it served its purpose in
  // the Gatekeeper and is not needed for storage.

  try {
    // ── Step 2: delegate to the service ────────────────────────────────────
    const { user } = await registerUser(firstName, email, password);

    // ── Step 3: 201 Created — new account is live ──────────────────────────
    // 201 (not 200) is the semantically correct status for a resource creation.
    return res.status(201).json({
      success: true,
      message: `Welcome, ${user.firstName}! Your account has been created.`,
      user,   // safe subset: id, firstName, email, registeredAt — no hash
    });

  } catch (err) {
    // ── Step 4: map domain errors to HTTP statuses ─────────────────────────

    if (err.code === 'EMAIL_TAKEN') {
      // 409 Conflict — the resource (email) already exists.
      return res.status(409).json({
        success: false,
        error: 'An account with that email address already exists.',
      });
    }

    if (err.code === 'WRITE_FAILED') {
      // The service could not persist the new user.
      console.error('[registerController] Persistence error:', err.cause ?? err);
      return res.status(500).json({
        success: false,
        error: 'Failed to create account due to a server error. Please try again.',
      });
    }

    // Catch-all for truly unexpected errors.
    console.error('[registerController] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred. Please try again later.',
    });
  }
}

module.exports = { register };
