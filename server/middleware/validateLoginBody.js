/**
 * middleware/validateLoginBody.js — Login Gatekeeper
 *
 * Validates the POST /api/login request body BEFORE it reaches the
 * controller. Stops obviously bad requests early so the controller
 * never receives empty strings or missing fields.
 *
 * Security note — generic messaging:
 *   We deliberately avoid revealing WHICH field is wrong in
 *   production-style messages (see the 401 note in the controller).
 *   Here at the 400 level we only check structure, not credentials,
 *   so it is safe to say "email is required" — that leaks no account
 *   information, it just enforces a proper request shape.
 *
 * Request lifecycle position:
 *   POST /api/login
 *     → [validateLoginBody ← YOU ARE HERE]  (structural gating)
 *     → [loginController]                   (credential checking)
 *     → [authService]                       (bcrypt + JWT)
 */

/**
 * Basic email-shape regex — good enough for a gate check.
 * Full RFC 5322 validation happens implicitly when the lookup fails.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * validateLoginBody
 *
 * Rules:
 *   1. Body must be a JSON object (Express's json() middleware handles parsing).
 *   2. `email`    — required, non-empty string, looks like an email address.
 *   3. `password` — required, non-empty string.
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
function validateLoginBody(req, res, next) {
  const { email, password } = req.body ?? {};

  // ── Rule 2: email ─────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({
      success: false,
      error: '`email` is required.',
    });
  }

  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: '`email` must be a valid email address.',
    });
  }

  // ── Rule 3: password ──────────────────────────────────────────────────────
  if (!password || typeof password !== 'string' || password === '') {
    return res.status(400).json({
      success: false,
      error: '`password` is required.',
    });
  }

  // ── Normalise in-place and pass through ───────────────────────────────────
  req.body.email = email.trim().toLowerCase();
  next();
}

module.exports = { validateLoginBody };
