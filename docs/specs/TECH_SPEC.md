# Technical Specification
## Password Strength Analyzer & Generator

Companion to `PRD.md`. This document covers architecture, data flow, API contracts, and key implementation details.

---

## 1. Architecture Overview

```
┌─────────────────┐        HTTPS         ┌──────────────────┐        HTTPS        ┌──────────────────────┐
│                  │  ───────────────▶   │                  │  ──────────────▶   │                      │
│  Browser (SPA)   │                     │  Backend (Flask/  │                    │  HIBP Range API      │
│  HTML/CSS/JS     │  ◀───────────────   │  FastAPI, Python) │  ◀──────────────   │  api.pwnedpasswords  │
│                  │                     │                  │                    │  .com                 │
└─────────────────┘                     └──────────────────┘                    └──────────────────────┘
```

- The browser never sends the plaintext password to the backend for the breach check — only for the strength analysis, which can also be done fully client-side if preferred (see Section 5).
- The backend acts as a thin proxy for the HIBP call, forwarding only a 5-character hash prefix.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Python 3.11+, Flask (or FastAPI) | Small surface area, easy to demo |
| HTTP client | `requests` | For HIBP API calls |
| Frontend | HTML + vanilla JS + CSS (or React if a SPA framework is preferred) | Keep it simple for v1 |
| Password generation | Python `secrets` module | Cryptographically secure |
| Hashing | Python `hashlib.sha1` | Required format for HIBP API |

No database is required for v1.

---

## 3. API Contracts

### 3.1 `POST /api/analyze`
Analyzes password strength using regex + heuristics. Runs server-side so the logic is centralized and testable, though it could equally run client-side for zero round-trip latency.

**Request**
```json
{ "password": "Str0ng!Pass123" }
```

**Response**
```json
{
  "score": 82,
  "label": "Strong",
  "checks": {
    "length_ok": true,
    "has_lower": true,
    "has_upper": true,
    "has_digit": true,
    "has_symbol": true,
    "is_common_password": false,
    "has_sequential_chars": false
  },
  "suggestions": [
    "Consider increasing length to 16+ characters for extra margin."
  ]
}
```

### 3.2 `GET /api/breach-check?prefix={5charhash}`
Proxies the HIBP range API using the k-anonymity model.

**Request**
```
GET /api/breach-check?prefix=5BAA6
```

**Backend behavior**
1. Validate `prefix` is exactly 5 hex characters.
2. Call `https://api.pwnedpasswords.com/range/{prefix}` with header `Add-Padding: true` (recommended by HIBP to prevent response-size timing attacks).
3. Return the raw suffix list to the client.

**Response**
```json
{
  "suffixes": [
    { "suffix": "1E4C9B93F3F0682250B6CF8331B7EE68FD8", "count": 3730471 },
    { "suffix": "003D68EB55068C33ACE09247EE4C639306B", "count": 2 }
  ]
}
```

The **client** computes the full SHA-1 hash locally, takes the suffix (characters 6+), and checks it against the returned list. This ensures the backend never sees the full hash or password.

### 3.3 `GET /api/generate?length=16&symbols=true&numbers=true&exclude_ambiguous=true`
Returns a securely generated random password.

**Response**
```json
{ "password": "xQ7$mPz2!vT9@wLk" }
```

---

## 4. Strength Scoring Algorithm (Reference)

Pseudocode for the core scoring logic:

```python
import re
import hashlib

COMMON_PASSWORDS = load_common_password_set()  # bundled top-10k list

def analyze_password(password: str) -> dict:
    checks = {
        "length_ok": len(password) >= 12,
        "has_lower": bool(re.search(r"[a-z]", password)),
        "has_upper": bool(re.search(r"[A-Z]", password)),
        "has_digit": bool(re.search(r"\d", password)),
        "has_symbol": bool(re.search(r"[^A-Za-z0-9]", password)),
        "is_common_password": password.lower() in COMMON_PASSWORDS,
        "has_sequential_chars": has_sequential_or_repeated(password),
    }

    score = 0
    score += min(len(password), 20) * 3          # length contributes up to 60
    score += 10 * sum([checks["has_lower"], checks["has_upper"],
                       checks["has_digit"], checks["has_symbol"]])  # up to 40
    if checks["is_common_password"]:
        score = min(score, 10)                    # hard cap for known-bad passwords
    if checks["has_sequential_chars"]:
        score -= 15

    score = max(0, min(100, score))
    label = score_to_label(score)

    return {"score": score, "label": label, "checks": checks,
            "suggestions": build_suggestions(checks)}
```

`has_sequential_or_repeated` scans for ascending/descending runs (`abc`, `321`) and repeated-character runs (`aaa`) of length 3+.

---

## 5. Client-Side vs Server-Side Analysis

Both are valid; pick one based on what you want to demonstrate:

- **Server-side** (as specced above): centralizes logic, easier to unit test, matches the "backend project" framing of the brief.
- **Client-side**: zero latency, fully offline-capable for the strength meter (breach check still needs the network). Would move the Python logic into equivalent JS.

*Recommendation:* keep strength analysis server-side to showcase the Python/regex skills called out in the brief, and treat the breach check proxy as the "pro-move" backend feature.

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| HIBP API times out or is unreachable | Show "Breach check unavailable — please try again later." Strength meter still works. |
| HIBP API rate-limits (HTTP 429) | Show a friendly retry-later message; do not retry automatically in a loop. |
| Empty password input | Disable analysis; show placeholder state. |
| Password generator called with invalid length (e.g., 0 or negative) | Clamp to a safe default (e.g., 12) and note it in the response. |

---

## 7. Security Notes

- Always use HTTPS for the HIBP call.
- Never log the password or full SHA-1 hash on the backend — only the 5-character prefix, if anything.
- Serve the frontend over HTTPS as well, especially since password data is involved.
- Consider a `Content-Security-Policy` header restricting script sources.
- Do not persist passwords in any form (memory-only, cleared after each request/response cycle).

---

## 8. Suggested Project Structure

```
password-tool/
├── backend/
│   ├── app.py                # Flask/FastAPI entrypoint
│   ├── analyzer.py           # strength scoring logic
│   ├── breach_check.py       # HIBP proxy logic
│   ├── generator.py          # secure password generator
│   ├── data/common_passwords.txt
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── docs/
│   ├── PRD.md
│   └── TECH_SPEC.md
└── README.md
```

---

## 9. Testing Notes

- Unit tests for `analyzer.py`: verify each regex check independently, verify common-password detection, verify sequential-character detection.
- Integration test for breach check: use a known-breached test string (e.g., `password`) and confirm a non-zero breach count is returned; use a freshly generated random password and confirm zero matches.
- Manual test: disconnect network and confirm the strength meter still functions while the breach check degrades gracefully.
