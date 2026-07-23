# Security Policy & Threat Model

---

## 1. Purpose & Scope

This document describes the threat model, data-handling guarantees, and security controls for **CipherGuard** (Password Strength Analyzer & Generator). It covers the React Vite web frontend, the FastAPI backend API, and the integration with the external Have I Been Pwned (HIBP) API.

---

## 2. Data Classification

| Data | Sensitivity | Handling rule |
|---|---|---|
| Password typed by user for strength analysis | High (secret-adjacent) | Never logged, never stored, never sent to any third party in full form. Transmitted to backend only over HTTPS via `POST /api/analyze`, only for the duration of a single request. |
| Password hash prefix (5 hex chars) for breach check | Low-medium (irreversible fragment) | Sent to HIBP over HTTPS (`https://api.pwnedpasswords.com/range/{prefix}`) with `Add-Padding: true`. Never logged with enough context to be linked back to a full password. |
| Generated password (output) | High (secret-adjacent) | Returned once to the requesting client; never stored server-side; not logged. |
| Request metadata (IP, timestamp, endpoint) | Low | Processed in-memory by `slowapi` rate limiter, not stored in any database. |

**Guarantee**: At no point does the full plaintext password or full 40-character SHA-1 password hash leave the user's browser for breach checks. Only a 5-character hash prefix is ever transmitted to the Have I Been Pwned range API (k-anonymity model).

---

## 3. Threat Model

### 3.1 Spoofing
- **Threat**: A malicious frontend or script impersonates the legitimate client to abuse the API.
- **Mitigation**: CORS middleware restricted explicitly to allowed origins (`http://localhost:5173`, `http://localhost:3000`). Wildcards (`*`) are strictly prohibited. Rate limiting via `slowapi` protects against automated API abuse.

### 3.2 Tampering
- **Threat**: Request/response data is modified in transit.
- **Mitigation**: HTTPS enforced end-to-end (`Strict-Transport-Security: max-age=31536000; includeSubDomains`). All API responses are read-only computations with no client-supplied state trusted beyond the current request body.

### 3.3 Repudiation
- **Threat**: Inability to investigate API abuse.
- **Mitigation**: Structured server-side logging with an automated filter (`SensitiveDataRedactingFilter` at `backend/utils/redactor.py`) that scrubs passwords and 40-character hashes before writing log entries, verified by `tests/test_redactor.py::test_logging_filter_scrubs_passwords`.

### 3.4 Information Disclosure
- **Threat**: Password values, hashes, or internal error details leak via logs, error responses, browser history, or third-party services.
- **Mitigations**:
  - Analysis endpoint is `POST /api/analyze`, avoiding password reflection in URL query parameters or browser history.
  - `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` set on all responses to prevent browser or proxy caching.
  - Generic error responses in production; full details logged server-side only with redaction applied (`backend/app.py` global exception handler).
  - FastAPI interactive docs (`/docs`, `/redoc`) disabled in production (`ENVIRONMENT=production`).

### 3.5 Denial of Service
- **Threat**: Oversized input causes CPU exhaustion (ReDoS) or memory exhaustion; abusive request volume exhausts the HIBP rate limit.
- **Mitigations**:
  - Input length cap (max 256 characters) enforced server-side via Pydantic model (`AnalyzeRequest.password` in `backend/app.py`).
  - Regex patterns use linear-time checks without nested quantifiers to eliminate ReDoS risks.
  - Rate limiting via `slowapi` (`30/min` analyze, `20/min` breach check, `60/min` generate).
  - HIBP proxy returns a clear `429` / `503` status with user-friendly retry guidance when upstream limits are hit.

### 3.6 Elevation of Privilege
- **Threat**: Container or host compromise.
- **Mitigations**:
  - Container runs as a non-root user (`USER cipherguard`, UID 10000) defined in `Dockerfile`.
  - Multi-stage Docker build separating build tools from runtime environment.
  - No secrets baked into images; configuration supplied via environment variables (`.env`).

---

## 4. Third-Party Dependency: Have I Been Pwned API

- **Endpoint used**: `https://api.pwnedpasswords.com/range/{first5}`
- **Data sent**: 5-character SHA-1 hash prefix only.
- **Data received**: List of matching hash suffixes + breach counts (no passwords).
- **Transport**: HTTPS over TLS 1.3/1.2.
- **Failure handling**: 5.0-second timeout window; degrades gracefully by notifying user while leaving analyzer and generator fully functional.
- **Security header used**: `Add-Padding: true` included in every request to prevent response-size timing attacks.

---

## 5. Security Controls Summary (Checklist)

| Control | Implemented? | Where / How | Test that proves it |
|---|---|---|---|
| Input length validation (max 256) | Yes | `backend/app.py` (`AnalyzeRequest`) | `tests/test_api.py::test_analyze_endpoint_oversized_input` |
| ReDoS-safe regex | Yes | `backend/analyzer.py` | `tests/test_analyzer.py::test_input_length_capping` |
| No password in logs | Yes | `backend/utils/redactor.py` | `tests/test_redactor.py::test_logging_filter_scrubs_passwords` |
| No password in URLs (POST only) | Yes | `backend/app.py` (`POST /api/analyze`) | `tests/test_api.py::test_analyze_endpoint_success` |
| Cache-Control: no-store | Yes | `backend/app.py` (`add_security_headers`) | `tests/test_api.py::test_security_headers_present` |
| HTTPS / HSTS | Yes | `backend/app.py` (`Strict-Transport-Security`) | `tests/test_api.py::test_security_headers_present` |
| CSP header | Yes | `backend/app.py` (`Content-Security-Policy`) | `tests/test_api.py::test_security_headers_present` |
| X-Content-Type-Options / X-Frame-Options | Yes | `backend/app.py` (`nosniff`, `DENY`) | `tests/test_api.py::test_security_headers_present` |
| CORS restricted to known origin(s) | Yes | `backend/app.py` (`CORSMiddleware`) | `tests/test_api.py::test_cors_rejects_unlisted_origin` |
| Rate limiting | Yes | `backend/app.py` (`slowapi`) | `backend/app.py` (`@limiter.limit`) |
| Secure random generation (`secrets`) | Yes | `backend/generator.py` | `tests/test_generator.py::test_generator_default_options` |
| Dependency vulnerability scan in CI | Yes | `.github/workflows/ci.yml` (`pip-audit`) | CI Workflow step |
| SAST scan in CI (`bandit`) | Yes | `.github/workflows/ci.yml` (`bandit`) | CI Workflow step |
| Non-root container user | Yes | `Dockerfile` (`USER cipherguard`) | Dockerfile step |
| No secrets committed to git | Yes | `.env.example` placeholder | Repository check |
| Generic error messages in prod | Yes | `backend/app.py` (`global_exception_handler`)| `backend/app.py` |

---

## 6. Reporting a Vulnerability

If you discover a security vulnerability in CipherGuard:

1. Do **not** open a public GitHub issue describing the vulnerability.
2. Email `security@cipherguard.internal` with reproduction steps and impact details.
3. You will receive an acknowledgment within 48 hours and periodic updates until resolution.
