/**
 * middleware/validateRegisterBody.js — Registration Gatekeeper
 *
 * Validates the POST /api/register request body BEFORE it reaches the
 * controller. Rejects structurally bad requests immediately so the service
 * never receives garbage input.
 *
 * Rules enforced here (structural only — no DB calls):
 *   1. `firstName`       — required, non-empty string, max 50 chars.
 *   2. `email`           — required, valid email shape.
 *   3. `password`        — required, min 8 chars, must contain at least one
 *                          uppercase letter, one digit, and one special char.
 *   4. `confirmPassword` — required, must match `password`.
 *   5. No unknown fields accepted.
 *
 * Request lifecycle position:
 *   POST /api/register
 *     → [validateRegisterBody ← YOU ARE HERE]
 *     → [registerController]
 *     → [registerService]
 */

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password strength: min 8 chars, ≥1 uppercase, ≥1 digit, ≥1 special char.
 * Explained to the client in plain language — this is structural feedback,
 * not credential feedback, so being specific is safe.
 */
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const ALLOWED_FIELDS = new Set(['firstName', 'email', 'password', 'confirmPassword']);

/**
 * validateRegisterBody
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
function validateRegisterBody(req, res, next) {
  const body = req.body ?? {};

  // ── Rule 5: no unknown fields ─────────────────────────────────────────────
  const unknown = Object.keys(body).filter((k) => !ALLOWED_FIELDS.has(k));
  if (unknown.length) {
    return res.status(400).json({
      success: false,
      error: `Unknown field(s): ${unknown.join(', ')}.`,
    });
  }

  const { firstName, email, password, confirmPassword } = body;

  // ── Rule 1: firstName ─────────────────────────────────────────────────────
  if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
    return res.status(400).json({ success: false, error: '`firstName` is required.' });
  }
  if (firstName.trim().length > 50) {
    return res.status(400).json({ success: false, error: '`firstName` must be 50 characters or fewer.' });
  }

  // ── Rule 2: email ─────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ success: false, error: '`email` is required.' });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ success: false, error: '`email` must be a valid email address.' });
  }

  // ── Rule 3: password strength ─────────────────────────────────────────────
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: '`password` is required.' });
  }
  if (!PASSWORD_RE.test(password)) {
    return res.status(400).json({
      success: false,
      error:
        '`password` must be at least 8 characters and include one uppercase letter, one number, and one special character.',
    });
  }

  // ── Rule 4: confirmPassword ───────────────────────────────────────────────
  if (!confirmPassword) {
    return res.status(400).json({ success: false, error: '`confirmPassword` is required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, error: '`password` and `confirmPassword` do not match.' });
  }

  // ── Normalise in-place ────────────────────────────────────────────────────
  req.body.firstName = firstName.trim();
  req.body.email     = email.trim().toLowerCase();
  next();
}

module.exports = { validateRegisterBody };
