# CipherGuard 🛡️
> Production-Grade Password Security Analyzer, Generator & HIBP k-Anonymity Proxy

CipherGuard is a high-performance, security-hardened single-page web application designed to evaluate password strength, perform k-anonymity breach checks against Have I Been Pwned, and generate cryptographically secure alternative passwords.

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
- **Hardened Security Architecture**: Input capping (max 256 chars), `Cache-Control: no-store`, HSTS, CSP, rate limiting (`slowapi`), non-root Docker container, and log redacting filters.

---

## 🛠️ Quick Start & Local Development

### 1. Running with Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/AshXtreme/Cipher_Guard.git
cd Cipher_Guard

# 2. Copy environment template
cp .env.example .env

# 3. Spin up backend container
docker-compose up --build
```
The FastAPI backend will be available at `http://localhost:8000`.

### 2. Manual Development Setup

#### Backend (Python 3.11+)
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Run FastAPI server locally with Uvicorn
uvicorn backend.app:app --reload --port 8000
```

#### Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install node packages
npm install

# Start Vite dev server
npm run dev
```
The React frontend will run at `http://localhost:5173`.

---

## 🔒 Security Guarantees & Privacy Controls

- **Zero-Knowledge Data Handling**: Plaintext passwords and full 40-character SHA-1 hashes **never** leave the browser for breach checks.
- **Log Redaction**: Automated logging filters (`backend/utils/redactor.py`) scrub sensitive keys (`password`, `secret`, `token`) and SHA-1 hashes from system log streams.
- **ReDoS & Hashing DoS Mitigation**: Hard length limit (256 characters) enforced server-side via Pydantic model validation.
- **Rate Limiting**: `slowapi` protects API routes against brute-forcing (`30/min` analyze, `20/min` breach check, `60/min` generate).

---

## 📖 API Endpoint Reference

| Method | Endpoint | Query / Body Params | Description |
|---|---|---|---|
| `POST` | `/api/analyze` | Body: `{ "password": "..." }` | Analyzes password strength and returns score, label, checks, and tips. |
| `GET` | `/api/breach-check` | Query: `prefix` (5 hex chars) | Proxies HIBP range API with `Add-Padding: true` and returns suffix matches. |
| `GET` | `/api/generate` | Query: `length`, `symbols`, `numbers`, `exclude_ambiguous` | Returns securely generated password & bit entropy score. |
| `GET` | `/health` | None | Returns `{ "status": "healthy" }` for monitoring uptime. |

---

## 🧪 Testing & Quality Assurance

```bash
# Run backend test suite (unit + integration + redactor)
source .venv/bin/activate
pytest -v
```

CI workflow automatically runs `bandit` SAST security scans, `pip-audit` vulnerability audits, and `pytest` on every pull request.
