/**
 * js/auth.js
 *
 * Handles the unified #modallogin auth modal:
 *   - Tab switching between Login and Register panels
 *   - POST /api/login  → stores JWT in localStorage, updates nav icon state
 *   - POST /api/register → switches to login tab on success
 *
 * No jQuery — vanilla JS only, runs after DOM is ready.
 */

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * showMessage — displays a success or error message inside a panel.
   * @param {HTMLElement} el   — the #login-error / #register-error element
   * @param {string}      msg  — message text
   * @param {'error'|'success'} type
   */
  function showMessage(el, msg, type) {
    el.textContent = msg;
    el.hidden = false;
    el.className = `auth-message auth-message--${type}`;
  }

  function clearMessages(...els) {
    els.forEach((el) => { if (el) { el.hidden = true; el.textContent = ''; } });
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.originalText;
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  /**
   * switchTab — shows the requested panel, hides the other, updates tab styles.
   * Works for both the header tab buttons and the inline "switch" links.
   * @param {'login'|'register'} tab
   */
  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.authTab === tab);
    });
    const loginPanel    = document.getElementById('auth-panel-login');
    const registerPanel = document.getElementById('auth-panel-register');
    if (!loginPanel || !registerPanel) return;

    loginPanel.hidden    = tab !== 'login';
    registerPanel.hidden = tab !== 'register';

    // Move focus to the first input in the active panel
    const firstInput = (tab === 'login' ? loginPanel : registerPanel).querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  // Delegate clicks on tab buttons and switch links
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-auth-tab]');
    if (trigger) switchTab(trigger.dataset.authTab);
  });

  // ── Update nav icon after login / logout ──────────────────────────────────

  function updateNavAuthState() {
    const user = getStoredUser();
    const icon = document.querySelector('#header a[data-bs-target="#modallogin"]');
    if (!icon) return;
    if (user) {
      icon.setAttribute('title', `Signed in as ${user.firstName}`);
      icon.style.color = 'var(--ed-crimson, #c8351f)';
    } else {
      icon.removeAttribute('title');
      icon.style.color = '';
    }
  }

  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('stylish_user')); } catch { return null; }
  }

  function storeSession(token, user) {
    localStorage.setItem('stylish_token', token);
    localStorage.setItem('stylish_user', JSON.stringify(user));
  }

  // ── POST /api/login ───────────────────────────────────────────────────────

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('login-error');
      const okEl  = document.getElementById('login-success');
      const btn   = document.getElementById('login-submit');
      clearMessages(errEl, okEl);
      setLoading(btn, true);

      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;

      try {
        const res  = await fetch('/api/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showMessage(errEl, data.error || 'Login failed.', 'error');
          return;
        }

        storeSession(data.token, data.user);
        showMessage(okEl, `Welcome back, ${data.user.firstName}!`, 'success');
        updateNavAuthState();
        loginForm.reset();

        // Close modal after a short delay so the user sees the success message
        setTimeout(() => {
          const modal = bootstrap.Modal.getInstance(document.getElementById('modallogin'));
          if (modal) modal.hide();
        }, 1200);

      } catch (err) {
        showMessage(errEl, 'Network error — please try again.', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ── POST /api/register ────────────────────────────────────────────────────

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('register-error');
      const okEl  = document.getElementById('register-success');
      const btn   = document.getElementById('register-submit');
      clearMessages(errEl, okEl);
      setLoading(btn, true);

      const firstName       = registerForm.firstName.value.trim();
      const email           = registerForm.email.value.trim();
      const password        = registerForm.password.value;
      const confirmPassword = registerForm.confirmPassword.value;

      try {
        const res  = await fetch('/api/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ firstName, email, password, confirmPassword }),
        });
        const data = await res.json();

        if (!res.ok) {
          showMessage(errEl, data.error || 'Registration failed.', 'error');
          return;
        }

        showMessage(okEl, `Account created! Please log in, ${data.user.firstName}.`, 'success');
        registerForm.reset();

        // Switch to login tab after short delay
        setTimeout(() => {
          switchTab('login');
          clearMessages(errEl, okEl);
        }, 1500);

      } catch (err) {
        showMessage(errEl, 'Network error — please try again.', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  // Ensure login tab is shown by default each time the modal opens
  const authModal = document.getElementById('modallogin');
  if (authModal) {
    authModal.addEventListener('show.bs.modal', () => switchTab('login'));
  }

  // Reflect login state on page load
  updateNavAuthState();

})();
