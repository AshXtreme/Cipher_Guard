# PRD — CipherGuard v1.7
## Offline TOTP/2FA QR Generator + Interactive Password Audit Dashboard

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.7 |
| Depends on | v1.0–v1.6 core. Feature 4 can reuse client-side classification logic already ported to JS for v1.5's heatmap, if that shipped. |
| Hard constraint | **Zero-cost only.** See Section 6. |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 0. Note on Balancing JavaScript and Python

You asked to keep a balance between JS and Python where possible, but not at the cost of things breaking. Here's the honest tradeoff for each feature, and how this PRD resolves it:

- **Feature 3 (TOTP)**: the core generation/QR/countdown needs to run client-side in JS regardless — a 30-second rotating code and a scannable QR are inherently a live, in-browser UI concern, and round-tripping to a backend would only add latency with no benefit. **Python gets a real, meaningful role here anyway**: an *optional*, off-by-default backend endpoint that demonstrates server-side TOTP verification (the pattern real services actually use — the server checks the code, not the client). This is genuinely useful (it shows the other half of how 2FA works in production) and gives Python a real job, not a token one.
- **Feature 4 (Audit Dashboard)**: this one is different — the whole point is auditing potentially real passwords in bulk, so sending that batch to a backend increases the risk surface for no real benefit (client-side JS can do everything needed: duplicate detection, weak-link detection, chart rendering). Forcing this into Python would mean transmitting real password batches over the network, which this PRD does not recommend. Instead, Python gets a **separate, standalone offline CLI script** (`tools/audit_cli.py`) that performs the identical audit logic for users who'd rather run it from a terminal against a local file — same functionality, zero network, parallel implementation rather than a network-coupled one.

Net effect: both features end up with real Python involvement, but neither one compromises the zero-network/zero-persistence guarantees to get there. If, once you see this, you'd rather drop either Python piece for simplicity, that's a fine call — flag it and the corresponding phase can be trimmed.

---

## 1. How Phasing Works for This PRD (read first)

Same protocol as v1.3–v1.6: nothing below begins until you explicitly say so. No auto-continuation between phases.

| Phase | Feature | Trigger phrase (example) |
|---|---|---|
| Phase 1 | Offline TOTP/2FA QR Generator (JS) | "Begin Phase 1" |
| Phase 1b | Optional: backend TOTP verify endpoint (Python) | "Begin Phase 1b" |
| Phase 2 | Password Audit Dashboard (JS) | "Begin Phase 2" |
| Phase 2b | Optional: standalone audit CLI (Python) | "Begin Phase 2b" |
| Phase 3 | Consolidation & documentation | "Begin Phase 3" |

Phase 1b and 2b are each independently optional and gated separately from their parent phase — finishing Phase 1 does not imply starting 1b.

---

## 2. Feature 3: Offline TOTP / 2FA QR Code & Secret Generator

### 2.1 What This Feature Actually Is (scope clarification)
This generates a **standalone practice/demo** TOTP secret and its `otpauth://totp/...` QR code so a user can test the scan-and-verify flow with an authenticator app (Google Authenticator, Authy, Ente Auth, etc.). It is important to be clear in the UI about one thing: **this does not, by itself, set up real 2FA for any external account.** A locally generated secret only becomes meaningful 2FA if a specific external service is separately configured to expect that same secret (most services generate their own secret and show you their QR — they don't accept an arbitrary one from elsewhere). Label this clearly as a sandbox/practice tool, not an account-setup tool, to avoid a user thinking they've "added 2FA to my email" by scanning a CipherGuard-generated code.

### 2.2 Behavior
- Generate a random TOTP secret (base32-encoded, standard length — typically 160 bits/20 bytes per RFC 4226/6238 convention) using a **cryptographically secure** random source.
- Render the corresponding `otpauth://totp/CipherGuard:demo?secret=...&issuer=CipherGuard` URI as a scannable QR code.
- Show a live, auto-refreshing 6-digit code with a visible 30-second countdown ring/bar, computed client-side from the same secret — so the user can visually confirm their authenticator app's code matches CipherGuard's own locally computed code, demonstrating that both sides are doing the same deterministic calculation from a shared secret.
- "Regenerate" button to get a fresh secret/QR at any time.

### 2.3 Security Notes
- The secret must be generated via a CSPRNG (`crypto.getRandomValues`, not `Math.random()`) — verify the chosen library actually does this rather than assuming.
- Nothing here is ever sent to a backend, logged, or persisted by default (see Phase 1b for the one explicit, opt-in exception).
- A QR code showing an `otpauth://` URI **is** the secret in a directly scannable form — treat it with the same "don't screenshot/share this" framing as any other credential material shown on screen. Add a brief note to that effect in the UI.
- Regenerating clears the old secret from memory; nothing about a previous secret should linger after regeneration.

### 2.4 Implementation Approach (JS, client-side)
- `otplib` (MIT-licensed) for TOTP secret generation and code computation — verify it uses `crypto.getRandomValues` under the hood (or configure it to) rather than a weaker default.
- `qrcode.react` (MIT-licensed) for rendering the QR code from the `otpauth://` URI string.
- Both libraries run entirely in-browser; no network call required for the core feature.

### 2.5 Testing
- Unit test: generated secrets are the correct length/format (valid base32, correct byte length) across many runs.
- Unit test: the same secret + same time window always produces the same 6-digit code (correctness of the TOTP algorithm implementation/config, per RFC 6238 test vectors if available).
- Unit test: zero network calls triggered by the core generation/QR/countdown flow.
- Manual test: scan the generated QR with a real authenticator app and confirm the 6-digit codes match CipherGuard's own live display across at least two 30-second windows.

---

## 3. Feature 3b (Optional): Backend TOTP Verify Endpoint (Python)

**Off by default. Purely educational/opt-in — the core feature (Section 2) works completely without this.**

### 3.1 Behavior
- An optional toggle: "Verify this code server-side (demo)." If enabled, the currently displayed 6-digit code and the secret are sent once to a new backend endpoint, `POST /api/totp/verify`, which uses `pyotp` (MIT-licensed, free) to independently confirm the code matches the secret for the current time window, and returns a simple `{ "valid": true/false }`.
- This exists purely to **show** the other half of how real-world 2FA verification works (the server checks the code against a secret it stored when 2FA was set up) — it is explicitly framed in the UI as a demo of that pattern, not a claim that this replicates a real account's verification flow.
- **This is the one place in this feature where the secret leaves the browser**, and that must be disclosed plainly right next to the toggle: "Enabling this sends your secret to CipherGuard's own backend once, for demonstration only. Leave this off to keep everything fully local."

### 3.2 Security Notes
- Endpoint must not log the secret or the code (redaction consistent with the rest of the app).
- Rate-limit this endpoint like the other API routes.
- No persistence of the secret server-side, even temporarily beyond the single request/response cycle.

### 3.3 Testing
- Unit test: correct code for a given secret/time returns `valid: true`; incorrect code returns `valid: false`.
- Unit test: secret/code never appear in logs (same redaction-testing pattern used elsewhere in the app).
- Test that the frontend never calls this endpoint unless the user has explicitly toggled it on.

---

## 4. Feature 4: Interactive Password Audit Dashboard

### 4.1 Behavior
- User pastes or imports (via local file, read client-side with the `FileReader` API — never uploaded) a batch of candidate passwords.
- The dashboard computes, for the whole batch, entirely client-side:
  - **Reuse Detector**: flags exact-duplicate passwords across entries.
  - **Weak Link Alert**: identifies which entry has the lowest score and is dragging down the batch average.
  - **Entropy Distribution Chart**: a visual summary (bar/histogram) of scores or entropy values across the batch.
- All computation happens in memory, using the same scoring logic already used elsewhere in the app (reuse, don't reimplement, the classification logic already ported to JS for v1.5's heatmap if that shipped — otherwise port the existing analyzer logic to a shared client-side utility once, rather than duplicating regex rules a second time).
- Batch data is never sent to any backend endpoint and never persisted — cleared on refresh/navigation, consistent with the rest of the app's session-only patterns (v1.2's comparison tool, v1.4's hashing sandbox).

### 4.2 A Naming/Scope Correction: "Age" Isn't Really Available
The original idea mentions an "Age/Entropy Chart," but CipherGuard has no persistence layer and no concept of "when was this password created/changed" — that data simply doesn't exist anywhere in this app's model, and inventing it would mean either (a) silently fabricating dates, which is worse than not showing them, or (b) adding real persistence just to track password age, which conflicts with the app's core no-persistence guarantee. **Resolution**: rename this to an **Entropy/Score Distribution Chart** (no age axis), and optionally let the user manually attach a free-text label per pasted entry (e.g., "email," "banking," "2019ish") purely for their own reference within the session — CipherGuard doesn't track or infer age itself.

### 4.3 Security/Privacy Framing
Unlike the Hashing Lab sandbox (which explicitly discourages real passwords), this feature's value genuinely depends on the user pasting real candidate passwords to get a meaningful audit. That raises the stakes on the guarantees already in place, so restate them prominently in this feature's own UI, not just in `SECURITY.md`:
> "This batch is analyzed entirely in your browser. Nothing here is sent anywhere or saved — it disappears when you refresh or leave this page."

### 4.4 Implementation Approach (JS, client-side)
- Reuse existing client-side analyzer logic (ported for v1.5, or ported now if not already available client-side) — one canonical scoring implementation, not two divergent copies in JS and Python.
- Chart rendering: a lightweight option is a small hand-rolled SVG bar chart (zero new dependency); if a fuller charting library is preferred, an MIT-licensed option like `recharts` is free and commonly available — confirm license before adding, consistent with this project's pattern.
- `FileReader` API (native, free) for local file import, if file import (vs. paste) is included.

### 4.5 Testing
- Unit test: duplicate detection correctly flags exact matches across a batch, including case-sensitivity handled deliberately (state whether duplicates are case-sensitive and test that choice explicitly).
- Unit test: weak-link detection correctly identifies the minimum-scoring entry.
- Unit test: batch data never triggers a network call (mock fetch/XHR, assert none fired).
- Unit test: chart data matches the underlying computed scores (no silent transformation/rounding errors between the two).

---

## 5. Feature 4b (Optional): Standalone Offline Audit CLI (Python)

**Independent companion tool, not part of the web app's request/response flow at all.**

### 5.1 Behavior
- A standalone script, `tools/audit_cli.py`, that a user runs locally (e.g., `python tools/audit_cli.py passwords.txt`) to get the same reuse/weak-link/distribution audit as Feature 4, but from the command line against a local file — never touching the web app's backend or network at all.
- Mirrors the **same scoring rules** as the web app's analyzer (reuse the existing Python scoring module already used by `/api/analyze`, rather than writing a third divergent implementation) so results are consistent between the web dashboard and the CLI.
- Outputs a simple terminal report (duplicate list, weakest entry, score distribution as a text histogram) — no file is written back out unless the user explicitly redirects output themselves.

### 5.2 Security Notes
- Entirely offline; the script never makes a network request.
- Does not write, cache, or log the input passwords anywhere beyond the user's own terminal output, which is the user's own machine and outside this app's control (same boundary as any CLI tool).

### 5.3 Testing
- Unit test: CLI output matches the web dashboard's scoring for the same input batch (consistency test between the two surfaces).
- Test with a sample file containing duplicates and a clear weak entry, confirming both are correctly identified in the CLI output.

---

## 6. Phased Implementation Plan

### Phase 1 — Offline TOTP/2FA QR Generator (JS)
**Exit criteria**: secret generation and QR rendering correct and CSPRNG-verified, live code matches a real authenticator app across multiple windows, zero network calls confirmed, sandbox/practice framing clear in UI, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 1.**

### Phase 1b — Backend TOTP Verify Endpoint (Python, optional)
**Exit criteria**: endpoint correctly validates codes via `pyotp`, off by default with explicit opt-in toggle and disclosure text, no logging/persistence of secret or code, rate-limited.
**⛔ Do not start until explicitly told to begin Phase 1b — this is a separate decision from Phase 1, not an automatic follow-on.**

### Phase 2 — Password Audit Dashboard (JS)
**Exit criteria**: reuse/weak-link/distribution logic correct and tested, "Age" renamed/resolved per 4.2, zero network calls confirmed, privacy framing shown in-UI, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 2.**

### Phase 2b — Standalone Audit CLI (Python, optional)
**Exit criteria**: CLI output consistent with the web dashboard for identical input, fully offline, no logging beyond terminal output.
**⛔ Do not start until explicitly told to begin Phase 2b.**

### Phase 3 — Consolidation & Documentation
**Scope**:
- Update `README.md`: document the TOTP practice-tool framing (and the optional verify endpoint's opt-in disclosure), the audit dashboard's privacy framing and the "Age" naming correction, and the CLI companion tool's usage.
- Update `SECURITY.md`: document that TOTP generation is zero-network by default with one clearly disclosed opt-in exception; document that the audit dashboard is zero-network and zero-persistence; note the CLI tool as a separate, non-networked utility.
- Add all features (including whichever optional phases were built) to the version changelog as v1.7.
**⛔ Do not start until explicitly told to begin Phase 3.**

---

## 7. Non-Goals / Known Limitations (v1.7)

- The TOTP generator does not set up 2FA for any real external account by itself — it's a practice/demo tool (see 2.1).
- No storage or history of previously generated TOTP secrets — each "Regenerate" discards the prior one.
- The Audit Dashboard has no concept of password "age" and does not claim to (see 4.2) — no persistence layer exists to support that.
- The CLI companion tool (4b) is a separate artifact from the web app; keeping it in sync with the web scoring logic is an ongoing maintenance consideration, mitigated by having both reuse the same underlying Python scoring module rather than diverging.

---

## 8. Acceptance Criteria (v1.7 overall)

- TOTP generation, QR rendering, and live code display work with zero network calls by default.
- If Phase 1b is built, the verify endpoint is off by default, clearly disclosed when enabled, and never logs sensitive values.
- Audit Dashboard performs all analysis client-side with zero network calls and zero persistence.
- "Age" is not fabricated or silently implied anywhere in the dashboard.
- If Phase 2b is built, the CLI's scoring is consistent with the web app's (shared underlying logic, not a duplicate reimplementation).
- No paid service, paid API, or paid library is introduced anywhere in this scope (Section 9).
- No phase (including the optional 1b/2b) begins without an explicit go-ahead in conversation.
- `README.md` and `SECURITY.md` updates (Phase 3) ship in the same release as whichever phases were built.

---

## 9. Zero-Cost Dependency Checklist

| Dependency | Purpose | Language | Cost | License |
|---|---|---|---|---|
| `otplib` | TOTP secret generation & code computation | JS | Free | MIT |
| `qrcode.react` | QR code rendering | JS | Free | MIT |
| `crypto.getRandomValues` | CSPRNG backing for secret generation | JS (native) | Free | N/A |
| `pyotp` (Phase 1b only) | Server-side TOTP verification | Python | Free | MIT |
| Existing Python scoring module (`/api/analyze` logic) | Shared scoring for CLI (Phase 2b) and web dashboard | Python | Free (already built) | N/A |
| `FileReader` API | Local batch import | JS (native) | Free | N/A |
| `recharts` (optional) or hand-rolled SVG | Entropy distribution chart | JS | Free | MIT (verify before adding) |

No new backend service beyond the optional, off-by-default TOTP verify endpoint, and no third-party network dependency at all for either feature's core functionality.
