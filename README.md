# CipherGuard 🛡️
> Security-Hardened Password Strength Analyzer, Generator & HIBP k-Anonymity Proxy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

CipherGuard is a security-conscious single-page web application that evaluates password strength, performs k-anonymity breach checks against Have I Been Pwned, and generates cryptographically secure alternative passwords.

For the full threat model, data-handling guarantees, and how to report a vulnerability, see [`SECURITY.md`](./SECURITY.md).

---

## 🌟 Key Features & Architecture

```
┌─────────────────┐        HTTPS (POST)        ┌──────────────────┐        HTTPS        ┌──────────────────────┐
│                 │  ──────────────────────▶   │                  │  ─────────────────▶ │                      │
│  React (Vite)   │                            │  FastAPI Backend │                     │  HIBP Range API      │
│  HeroUI v3      │  ◀──────────────────────   │  (Python 3.11+)  │  ◀───────────────── │  api.pwnedpasswords  │
│                 │      Score & Feedback      │                  │  5-Hex Prefix Only  │  .com                │
└─────────────────┘                            └──────────────────┘                     └──────────────────────┘
```

- **Live Heuristics Analyzer**: Real-time scoring (0–100) evaluating length, character diversity (`lower`, `upper`, `digit`, `symbol`), 3+ character sequential runs (`abc`, `123`, `aaa`), and top-10k dictionary word matches.
- **k-Anonymity Breach Check**: Computes SHA-1 hash locally in the browser, forwarding **only the first 5 hex characters** to the HIBP API proxy with `Add-Padding: true` headers.
- **Tactile Password Generator**: Cryptographically secure random selection (`secrets` module) with configurable length, character sets, ambiguous character filtering, and theoretical entropy calculation ($H = L \cdot \log_2 R$).
- **Monospaced Telemetry Terminal**: Real-time log stream demonstrating k-anonymity prefix forwarding and hash suffix match results.
- **Hardened Security Architecture**: Input capping (max 256 chars), `Cache-Control: no-store`, HSTS, CSP, restricted CORS, rate limiting (`slowapi`), non-root Docker container, and log-redacting filters.

---

## 🛠️ Quick Start & Local Development

> **Note on Docker scope**: `docker-compose.yml` currently containerizes the **backend only**. The frontend runs via the Vite dev server on your host machine for fast hot-module-reloading during development. This is intentional for local dev — see [Production Notes](#-production-notes) below for how this differs in a deployed environment.

### 1. Start the Backend (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/AshXtreme/Cipher_Guard.git
cd Cipher_Guard

# 2. Copy environment template
cp .env.example .env

# 3. Spin up the backend container
docker-compose up --build
```
The FastAPI backend will be available at `http://localhost:8000`. Interactive API docs (if enabled for your environment) are at `http://localhost:8000/docs`.

### 2. Start the Frontend (Vite dev server)

```bash
cd frontend
npm install
npm run dev
```
The React frontend will run at `http://localhost:5173` (Vite will auto-select `5174` if `5173` is already in use).

### 3. Manual Backend Setup (without Docker)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000
```

---

## ⚙️ Configuration

| Variable | Where | Purpose | Example |
|---|---|---|---|
| `ALLOWED_ORIGINS` | Backend `.env` | Comma-separated list of origins permitted by CORS. **No wildcards in production.** | `http://localhost:5173,http://localhost:3000` |
| `ENVIRONMENT` | Backend `.env` | Toggles debug behavior (e.g., disables interactive docs, enables verbose errors) | `development` / `production` |
| `PORT` | Backend `.env` | Port the FastAPI app listens on | `8000` |
| `VITE_API_BASE_URL` | `frontend/.env` | Backend URL the frontend calls | `http://localhost:8000` |

See `.env.example` and `frontend/.env.example` for the full list with placeholder values.

---

## 🔒 Security Guarantees & Privacy Controls

- **Scoped Zero-Knowledge Guarantee**: For **breach checking only**, the plaintext password and the full 40-character SHA-1 hash never leave the browser — only a 5-character hash prefix is sent to the backend, which forwards it to HIBP. This is the k-anonymity model.
- **Strength analysis is server-side by design**: The `/api/analyze` endpoint *does* receive the plaintext password over HTTPS so scoring can run in Python. It is never logged, cached, or stored — see the redaction guarantee below — but it is not a zero-knowledge operation, unlike the breach check.
- **Log Redaction**: Automated logging filters (`backend/utils/redactor.py`) scrub sensitive keys (`password`, `secret`, `token`) and SHA-1 hashes from system log streams.
- **ReDoS & Hashing DoS Mitigation**: Hard length limit (256 characters) enforced server-side via Pydantic model validation.
- **Restricted CORS**: Only origins listed in `ALLOWED_ORIGINS` are permitted; no wildcard origins.
- **Rate Limiting**: `slowapi` protects API routes against brute-forcing (`30/min` analyze, `20/min` breach check, `60/min` generate).

Full threat model and control-by-control checklist: [`SECURITY.md`](./SECURITY.md).

---

## 📖 API Endpoint Reference

| Method | Endpoint | Query / Body Params | Description |
|---|---|---|---|
| `POST` | `/api/analyze` | Body: `{ "password": "..." }` | Analyzes password strength and returns score, label, checks, and tips. Password is transmitted over HTTPS but never logged or stored. |
| `GET` | `/api/breach-check` | Query: `prefix` (5 hex chars) | Proxies HIBP range API with `Add-Padding: true` and returns suffix matches. Never receives a full password or full hash. |
| `GET` | `/api/generate` | Query: `length`, `symbols`, `numbers`, `exclude_ambiguous` | Returns securely generated password & bit entropy score. |
| `GET` | `/health` | None | Returns `{ "status": "healthy" }` for monitoring uptime. Reveals no internal details. |

---

## 🧪 Testing & Quality Assurance

```bash
# Run backend test suite (unit + integration + redactor)
source .venv/bin/activate
pytest -v
```

CI workflow automatically runs `bandit` SAST security scans, `pip-audit` vulnerability audits, and `pytest` on every pull request.

> **Frontend testing**: not yet covered by an automated suite. If you add non-trivial frontend logic (e.g., client-side entropy display, clipboard handling), add corresponding tests before merging.

---

## 🚧 Production Notes

This README currently documents **local development only**. Deploying CipherGuard beyond local dev (build steps, TLS termination, reverse proxy, environment-specific `ALLOWED_ORIGINS`, disabling interactive docs, etc.) is not yet documented here — treat any production deployment as requiring its own review pass against [`SECURITY.md`](./SECURITY.md) first.

---

## 📄 License

Licensed under the [MIT License](./LICENSE).
