# Stylish — Full-Stack E-commerce (Session 10: Go-Live)

A small e-commerce demo built for the 960121 course. Static HTML/JS frontend
served by an Express API backed by SQLite (`better-sqlite3`).

This README is the **contract** for the project: a reviewer should be able
to clone the repo, install once, and run.

---

## Architecture

```
┌──────────────┐          ┌────────────────────────────────┐
│  Browser     │  HTTP    │  Express (server/app.js)       │
│  index.html  │ ───────► │                                │
│  /js/*.js    │ ◄─────── │   /api/products  → catalog/    │
└──────────────┘          │   /api/login     → identity/   │
                          │   /api/register  → identity/   │
                          │   /api/checkout  → orders/     │
                          │                                │
                          │   shared/db.js  → store.db     │
                          └────────────────────────────────┘
                                          │
                                          ▼
                                   data/store.db (SQLite)
```

Each domain folder follows the **Route → Middleware → Controller → Service**
pattern from Session 9:

```
server/<domain>/
   routes/        URL-to-handler mapping
   middleware/    "Gatekeeper" validators (run before the controller)
   controllers/   HTTP ↔ business-logic bridge
   services/      Data access and business logic
```

Shared infrastructure (`db.js`, `config.js`) lives in `server/shared/`.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local secrets file from the template
cp .env.example .env
#    Open .env and replace JWT_SECRET with a long random string, e.g.
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Start the server
npm start
#    or, with auto-restart on save:
npm run dev
```

Then visit **http://localhost:3000**.

The first time the server boots it seeds `data/store.db` from
`data/json/users.json` and `data/json/products.json`.

---

## Environment variables

All secrets and environment-specific paths come from `.env` (see
`.env.example`). The app **refuses to start** if any required variable is
missing — there are no silent fallback defaults for secrets.

| Variable         | Required | Default        | Purpose                                  |
| ---------------- | -------- | -------------- | ---------------------------------------- |
| `NODE_ENV`       | no       | `development`  | Switches the error handler to "prod" mode |
| `PORT`           | no       | `3000`         | HTTP port for the API server             |
| `JWT_SECRET`     | **yes**  | —              | HMAC key used to sign login tokens       |
| `JWT_EXPIRES_IN` | no       | `24h`          | Token lifetime                           |
| `DB_PATH`        | **yes**  | —              | Path to the SQLite file, from repo root  |

---

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm start`      | Run the server (`node server/server.js`)      |
| `npm run dev`    | Same, with `--watch` for auto-restart          |

---

## Security posture (Go-Live Audit)

The full audit log lives in [`GO_LIVE_AUDIT.md`](./GO_LIVE_AUDIT.md). Headlines:

- Secrets are loaded from `.env` only — nothing is hard-coded.
- `*.db`, `.env`, and `node_modules/` are git-ignored.
- JSON bodies are capped at **10 kb** to block oversized-payload DoS.
- Production hides stack traces; development returns them for debugging.
- JWTs expire after **24 h**.

---

## Project layout

```
.
├── index.html, css/, js/, images/   Frontend (static)
├── data/                            SQLite DB + JSON seed files
├── server/
│   ├── server.js                    Bootstraps HTTP listener
│   ├── app.js                       Wires middleware + routes
│   ├── shared/                      config.js, db.js
│   ├── catalog/                     Products domain
│   ├── identity/                    Login / register
│   └── orders/                      Checkout
├── .env.example                     Template for local .env
├── .gitignore
└── package.json
```
