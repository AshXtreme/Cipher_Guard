# PRD — CipherGuard v1.4
## Client-Side Hashing & KDF Lab + Typo-Squatting Stress Test

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.4 (additive, client-side-heavy) |
| Depends on | v1.0–v1.3 core. **Feature 2 (Typo-Squatting) specifically depends on the v1.3 Phase 1 local Bloom filter being shipped and live** — see Section 2.5. |
| Hard constraint | **Zero-cost only** — no paid APIs, paid tiers, or paid libraries anywhere in this scope. See Section 6. |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 0. How Phasing Works for This PRD (read first)

Same protocol as v1.3: this PRD defines phases below, but **no phase begins until you explicitly say so** (e.g., "begin Phase 1"). Do not auto-continue between phases. If a build agent is executing this PRD, treat the phase boundaries as hard stops.

| Phase | Feature | Trigger phrase (example) |
|---|---|---|
| Phase 1 | Client-Side Hashing & KDF Lab | "Begin Phase 1" |
| Phase 2 | Typo-Squatting Stress Test | "Begin Phase 2" |
| Phase 3 | Consolidation & doc updates | "Begin Phase 3" |

Phase 1 has no dependency on Phase 2 or on v1.3. **Phase 2 has a hard dependency on v1.3 Phase 1 (Bloom filter) already being live** — do not start Phase 2 if that isn't in place; flag it back to the user instead of substituting something else.

---

## 1. Feature 1: Client-Side Hashing & KDF Lab (Cryptographic Playground)

### 1.1 Problem
Users (and reviewers of this portfolio project) benefit from seeing *why* fast hashes are bad for password storage and slow KDFs are good — abstract advice lands better with a live, interactive demonstration.

### 1.2 Important Security/UX Note (read before building)
This is an **educational sandbox**, not a password-strength tool, and the UI must make that distinction unmistakable:
- Use a clearly separate input field, visually and structurally distinct from every other password field in the app (different section, different label — e.g., "Try any text here" rather than anything resembling "Enter your password").
- Add explicit, persistent copy near the input: **"For demonstration only. Don't type a real password you use elsewhere — this is a sandbox to show how hashing works, not a strength check."**
- Consistent with the rest of CipherGuard's guarantees: nothing typed here is ever sent to the backend, logged, or persisted in any storage (memory-only, cleared on navigation/refresh). This must hold even though the data here is lower-stakes by design (arbitrary demo text) — the guarantee should be uniform across the whole app rather than "safe everywhere except this one screen."
- MD5 and SHA-1 outputs must be visually flagged as insecure (e.g., red badge/label: "Legacy — never use for password storage") wherever displayed, not just described once at the top of the page.

### 1.3 Behavior
- User types (or pastes) an arbitrary sample string into the sandbox input.
- Live (debounced) output panel shows, side by side:
  - **Legacy/unsafe hashes**: MD5, SHA-1 — labeled insecure.
  - **Modern fast hashes**: SHA-256, SHA-512 — labeled "fast, not suitable for password storage on their own."
  - **KDFs**: PBKDF2 (configurable iteration count, default matching current OWASP guidance — e.g., 600,000 for SHA-256 — with a slider capped at a sane max to avoid freezing the browser), and either bcrypt or Argon2 (see 1.4 for library choice) — labeled "suitable for password storage."
- Each output shows the resulting hash/derived key (hex or base64) and, for the KDFs, the **time taken to compute** in the browser — this is the actual pedagogical payoff: the user visibly feels PBKDF2/bcrypt/Argon2 take noticeably longer than MD5/SHA-1, which is the whole point.
- A short, plain-language caption under each category explaining *why* (e.g., "Fast hashes let an attacker try billions of guesses per second on cheap hardware; KDFs deliberately slow this down.").

### 1.4 Implementation Approach
- **MD5**: not natively supported by Web Crypto API (`window.crypto.subtle` only supports SHA-1/256/384/512) — use a small, free, open-source JS implementation (e.g., `blueimp-md5` or `js-md5`, both MIT-licensed) purely for this educational display.
- **SHA-1/256/512**: use `window.crypto.subtle.digest()` natively — zero dependency, built into the browser.
- **PBKDF2**: use `window.crypto.subtle.deriveBits()`/`deriveKey()` with the PBKDF2 algorithm — also natively supported, zero dependency.
- **bcrypt**: no native browser API; use a free, open-source JS/WASM implementation (e.g., `bcryptjs`, MIT-licensed) — note in the UI that this runs in pure JS and its timing is illustrative, not a benchmark of production bcrypt performance.
- **Argon2**: no native browser API; use a free, open-source WASM implementation (e.g., `argon2-browser`, ISC/MIT-licensed).
- **Performance/UI-blocking**: PBKDF2 at high iteration counts (and bcrypt/Argon2 generally) are deliberately CPU-intensive and **will block the main thread if run naively**, freezing the UI. Run all KDF computation inside a **Web Worker**, with a loading/progress indicator, so the rest of the app stays responsive. Cap the max iteration count / cost parameter exposed in the UI to something that completes in a few seconds on typical hardware, with a warning if the user pushes it higher.

### 1.5 Testing
- Unit tests verifying each hash function's output against known test vectors (e.g., MD5 of `"abc"` matches the well-known reference value) to catch library integration bugs.
- Unit test confirming the sandbox input is never included in any network request (mock fetch/XHR and assert zero calls triggered by this component).
- Test that the Web Worker properly reports completion and doesn't leave the UI in a permanently "loading" state on error.
- Manual test: confirm the disclaimer copy is present and visible without scrolling on common viewport sizes.

---

## 2. Feature 2: Password Typo-Squatting / Fat-Finger Stress Test

### 2.1 Problem
A password can be strong in the abstract but become a well-known weak/breached password with a single typo (e.g., a shift-key slip). Users don't currently get any signal about this.

### 2.2 User Story
As a user, I want to know if a small, realistic typing mistake would turn my strong password into something common or breached, so I can judge how much margin for error I actually have.

### 2.3 Behavior
- Given the user's current candidate password (from the main analyzer input — not a separate field), generate a **bounded** set of realistic single-mistake variants:
  - **Adjacent-key substitution**: swap a character for a QWERTY-adjacent key (using a small hardcoded keymap matrix).
  - **Transposition**: swap two adjacent characters.
  - **Shift-key slip**: toggle case, or substitute a shifted/unshifted counterpart on the same key (e.g., `1` ↔ `!`, where the keyboard layout defines that pairing).
  - **Single character drop or duplicate**: remove one character, or accidentally repeat one.
- Cap the variant set to **single-edit-distance mutations only** (one mistake per variant, not combinations) to keep the set small and the check fast — this is a deliberate scope boundary to avoid combinatorial blowup (a password of length $L$ produces on the order of a few $\times L$ variants, not an exponential set).
- Run each variant through the **existing v1.3 local Bloom filter** (zero network calls, per that feature's design) — do not call the backend or HIBP for this, both to keep it instant and to avoid ever transmitting near-verbatim password variants over the network.
- If any variant matches the Bloom filter, show a warning: *"A small typo (e.g., missing a shift key) would turn this into a commonly breached password — consider added complexity for more margin."* Show which mutation type triggered it (e.g., "shift-key slip") without necessarily displaying the exact mutated string in plain UI logs, to avoid drawing extra attention to a near-password value on screen longer than needed — displaying it transiently in the result is fine, just don't persist or log it.
- All computation (mutation generation + Bloom filter query) is 100% client-side, in-memory, ephemeral — consistent with the rest of the app's no-persistence guarantee.

### 2.4 Implementation Approach
- Small, pure utility functions: a QWERTY adjacency keymap (a simple JS object/lookup table), a Levenshtein-style single-edit mutation generator, and reuse of the existing Bloom filter query function from v1.3.
- No new backend endpoint. No new external dependency required beyond what v1.3 already introduced (the Bloom filter itself) — this feature can likely ship with **zero new dependencies**, which is the cleanest outcome.

### 2.5 Dependency on v1.3
This feature is only meaningful once the local Bloom filter (v1.3 Phase 1) exists — it's the lookup mechanism this feature relies on. **Confirm v1.3 Phase 1 is live before starting Phase 2 of this PRD.** If it isn't, this phase should not be started, and should not be reimplemented from scratch as a workaround (that would duplicate the v1.3 asset/library work) — surface this dependency gap back to the user instead.

### 2.6 Testing
- Unit test: a known common password with one character changed to its adjacent-key equivalent (e.g., `passwptd` — a real fat-finger of `password`) correctly reduces back to a Bloom-filter hit via the mutation generator.
- Unit test: mutation count for a password of length $L$ stays within the expected bounded range (regression guard against accidental combinatorial expansion).
- Unit test: zero network calls triggered by this feature (mock fetch/XHR, assert none fired).
- Edge case: very short passwords (e.g., length 1–2) don't crash the mutation generator.

---

## 3. Phased Implementation Plan

### Phase 1 — Client-Side Hashing & KDF Lab
**Scope**: Section 1 in full.
**Does not touch**: any existing endpoint, any existing password field/component (sandbox is fully separate).
**Exit criteria**: all hash/KDF outputs correct against test vectors, KDF computation runs in a Web Worker without freezing the UI, disclaimer copy present, zero network calls from this component, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 1.**

### Phase 2 — Typo-Squatting Stress Test
**Scope**: Section 2 in full.
**Prerequisite**: v1.3 Phase 1 (Bloom filter) must already be live — verify before starting (see 2.5).
**Does not touch**: any backend endpoint; reuses the existing Bloom filter query function as-is.
**Exit criteria**: mutation generator bounded and tested, Bloom filter integration working, warning UI in place, zero network calls, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 2.**

### Phase 3 — Consolidation & Documentation
**Scope**:
- Update `README.md`: document both features, note the sandbox's "don't use a real password here" guidance, note the Web Worker approach for KDF timing, note the typo-squatting feature's dependency on the v1.3 Bloom filter.
- Update `SECURITY.md`: confirm both features perform no network calls and persist nothing; note which new open-source libraries were added (MD5 lib, bcrypt lib, Argon2-WASM lib) with their licenses in `THIRD_PARTY_NOTICES.md`.
- Add both features to the version changelog as v1.4.
**⛔ Do not start until explicitly told to begin Phase 3.**

---

## 4. Non-Goals (v1.4)

- The Hashing/KDF Lab is not a real security control and doesn't affect how any password in the rest of the app is actually processed — it's purely educational/illustrative.
- The Typo-Squatting check only covers **single-edit-distance** mutations — it is not an exhaustive fuzzer and won't catch every possible small mistake (e.g., two simultaneous typos). This scope boundary should be stated in the UI copy, not just this doc.
- No support for non-QWERTY keyboard layouts in v1.4 (documented as a known limitation, not silently wrong).

---

## 5. Acceptance Criteria (v1.4 overall)

- Both features run with **zero network calls** at runtime.
- No paid service, paid API, or paid library is introduced anywhere in this scope (Section 6).
- The Hashing/KDF Lab never blocks the main UI thread (Web Worker verified).
- The Typo-Squatting feature is confirmed dependent on, and correctly gated behind, v1.3 Phase 1 being live.
- No phase begins without an explicit go-ahead in conversation, per Section 0.
- `README.md`, `SECURITY.md`, and `THIRD_PARTY_NOTICES.md` updates (Phase 3) ship in the same release.

---

## 6. Zero-Cost Dependency Checklist

| Dependency | Purpose | Cost | License |
|---|---|---|---|
| Web Crypto API (`window.crypto.subtle`) | SHA-1/256/512, PBKDF2 | Free (native browser API) | N/A |
| `blueimp-md5` or `js-md5` | MD5 (not in Web Crypto) | Free | MIT |
| `bcryptjs` | bcrypt demonstration | Free | MIT |
| `argon2-browser` (WASM) | Argon2 demonstration | Free | ISC/MIT |
| Existing v1.3 local Bloom filter | Typo-variant lookup | Free (already built) | MIT (per v1.3 PRD) |
| QWERTY adjacency keymap | Typo mutation generation | Free (hand-authored data, no external source) | N/A |

No new backend service and no new third-party network dependency is introduced by either feature in this PRD.
