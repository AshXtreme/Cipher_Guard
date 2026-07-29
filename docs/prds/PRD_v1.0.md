# Product Requirements Document (PRD)
## Password Strength Analyzer & Generator

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Owner | TBD |
| Target Platform | Web App |
| Est. Build Time | 1–2 days (core), +0.5 day (Pro-Move) |

---

## 1. Overview

A web application that lets a user type in a candidate password and instantly see:
1. A **strength score** based on length and character-class variety.
2. Whether the password has been **exposed in a known data breach** (via the Have I Been Pwned API, using k-anonymity so the real password is never sent over the network).
3. A **generated, strong alternative password** they can copy and use instead.

This is a portfolio-friendly, low-complexity project: no database, no user accounts, no auth — just client input, a bit of regex logic, one external API call, and a random generator.

---

## 2. Goals & Non-Goals

### Goals
- Give real-time, clear feedback on password strength.
- Detect common weaknesses: short length, no symbols, dictionary words, sequential/repeated characters.
- Check breach status safely (never transmit the plaintext password or full hash).
- Offer a one-click "Generate a strong password" alternative.
- Ship a clean, simple, responsive single-page UI.

### Non-Goals (v1)
- No user accounts, login, or saved password history.
- No storage of any password (plaintext or hashed) server-side or client-side beyond the current session.
- No password manager / autofill integration.
- No mobile app — web only.

---

## 3. Target Users

- Developers/students building a portfolio project.
- End users who want a quick, trustworthy password check tool (e.g., embedded in a signup form demo).

---

## 4. User Stories

| # | As a... | I want to... | So that... |
|---|---|---|---|
| 1 | User | type a password and see its strength instantly | I know if it's good enough |
| 2 | User | see *why* a password is weak (missing symbols, too short, etc.) | I know exactly what to fix |
| 3 | User | check if my password has leaked in a breach | I know if I need to change it elsewhere |
| 4 | User | generate a strong random password | I don't have to think one up myself |
| 5 | User | copy the generated password with one click | I can paste it directly into a form |
| 6 | User | trust that my password isn't being sent anywhere insecurely | I feel safe using the tool |

---

## 5. Functional Requirements

### 5.1 Password Strength Analyzer
- Input: a text field (masked by default, with a show/hide toggle).
- Checks performed via regex:
  - Contains lowercase letter `[a-z]`
  - Contains uppercase letter `[A-Z]`
  - Contains digit `[0-9]`
  - Contains symbol `[^A-Za-z0-9]`
  - Length thresholds (e.g., <8 weak, 8–11 medium, 12+ strong)
- Additional checks:
  - Common password / dictionary word match (against a bundled top-10k common password list).
  - Sequential characters (`abcd`, `1234`) or repeated characters (`aaaa`) penalty.
- Output: a strength label (**Very Weak / Weak / Fair / Strong / Very Strong**), a numeric score (0–100), a visual meter, and a bullet list of specific improvement suggestions.

### 5.2 Breach Check (Have I Been Pwned Integration — "Pro-Move")
- Uses the **k-anonymity model**:
  1. SHA-1 hash the password client-side (or server-side proxy — see Section 7).
  2. Send only the **first 5 characters** of the hash to `https://api.pwnedpasswords.com/range/{first5}`.
  3. API returns all hash suffixes matching that prefix, with breach counts.
  4. Locally compare the remaining hash characters to find a match.
- Output: "This password has appeared in N known data breaches" or "No breaches found."
- Must gracefully handle API failure/timeout (show a neutral message, don't block the rest of the tool).

### 5.3 Password Generator
- Button: "Generate strong password."
- Configurable options: length (default 16), include symbols, include numbers, exclude ambiguous characters (`0/O`, `1/l`).
- Uses a cryptographically secure random source (`secrets` module in Python, or `crypto.getRandomValues` in JS).
- One-click "Copy to clipboard."

### 5.4 UI/UX
- Single page, no navigation required.
- Real-time feedback as the user types (debounced).
- Clear visual meter (color-coded: red → yellow → green).
- Responsive layout (mobile-friendly).

---

## 6. Non-Functional Requirements

- **Privacy/Security**: Plaintext password never leaves the browser except as a partial SHA-1 hash prefix (5 chars) sent over HTTPS. No password is logged or stored anywhere.
- **Performance**: Strength analysis feedback should feel instant (<100ms client-side). Breach check may take up to ~1s due to network latency.
- **Reliability**: If the HIBP API is unreachable, the rest of the app (strength meter, generator) must continue to work.
- **Accessibility**: Form fields labeled, sufficient color contrast, meter also expressed as text (not color alone).

---

## 7. Technical Approach (Summary — see TECH_SPEC.md for details)

- **Backend**: Python (Flask or FastAPI) exposes:
  - `POST /api/analyze` — strength scoring logic (regex + dictionary check).
  - `GET /api/breach-check?prefix=XXXXX` — proxies the HIBP range API (avoids CORS issues and keeps the pattern consistent, though HIBP's range API is CORS-friendly enough to call directly from JS too).
  - `GET /api/generate` — returns a secure random password.
- **Frontend**: Simple HTML/CSS/JS (or a lightweight framework) single page.
- **External dependency**: `requests` library (Python) for the HIBP API call if done server-side; or native `fetch` if done client-side.

---

## 8. Success Metrics

- Core logic (strength scoring) implementable in <100 lines of Python, per project brief.
- Breach check correctly identifies known-breached test passwords (e.g., `password`, `123456`) as breached, and a freshly generated random password as not breached.
- No password value (full password or full hash) ever appears in network request logs.

---

## 9. Milestones

| Phase | Deliverable |
|---|---|
| 1 | Core regex-based strength analyzer (CLI or script) |
| 2 | Web UI wired to strength analyzer |
| 3 | HIBP breach check integration (k-anonymity) |
| 4 | Password generator + copy-to-clipboard |
| 5 | Polish: accessibility, responsive design, error handling |

---

## 10. Open Questions

- Should the breach check call HIBP directly from the browser (simpler, but exposes API dependency to client) or via a backend proxy (adds a moving part, but centralizes error handling and rate limiting)? *Recommendation: backend proxy for a cleaner demo of "pro-move" backend skills.*
- Should the common-password/dictionary list be bundled locally or fetched from a public wordlist source at build time?
