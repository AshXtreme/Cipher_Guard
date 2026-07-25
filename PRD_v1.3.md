# PRD — CipherGuard v1.3
## Local Bloom Filter Pre-Check & Time-to-Crack Simulator

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.3 (additive, client-side-heavy) |
| Depends on | v1.0–v1.2 core (analyze, breach-check, generate, entropy display) |
| Hard constraint | **Zero-cost only** — no paid APIs, paid tiers, paid datasets, or paid libraries anywhere in this scope. See Section 6. |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 0. How Phasing Works for This PRD (read first)

This PRD defines **three phases**. Each phase is fully specified below, but **implementation must not begin on any phase until you explicitly say so** — e.g. "begin Phase 1" or "start the Bloom filter asset build." Do not auto-continue from one phase to the next just because the previous one finished; stop and wait for the next explicit go-ahead every time. If a build agent (e.g., Antigravity) is executing this PRD, this instruction should be treated as a hard stop between phases, not a suggestion.

| Phase | Feature | Trigger phrase (example) |
|---|---|---|
| Phase 1 | Local Bloom Filter Pre-Check | "Begin Phase 1" |
| Phase 2 | Time-to-Crack Simulator | "Begin Phase 2" |
| Phase 3 | Consolidation & doc updates | "Begin Phase 3" |

Phases 1 and 2 have no dependency on each other and can be built in either order or in parallel — the order above is a suggestion, not a requirement.

---

## 1. Feature 1: Local Bloom Filter "Top-100k" Pre-Check

### 1.1 Problem
Right now, every password check — even for something as obviously bad as `123456` — either waits on a server round-trip (`/api/analyze`) or a network call to HIBP (`/api/breach-check`). A local, client-side Bloom filter can flag the most common passwords **instantly, in-browser, with zero network calls**, before any server interaction happens.

### 1.2 User Story
As a user, when I type an extremely common password, I want to see an immediate "this is a known top-100k password" warning without waiting on any network request.

### 1.3 Behavior
- On password input (debounced), query a pre-built Bloom filter held in browser memory.
- If the filter returns **positive** (possible match — Bloom filters have false positives, never false negatives): immediately show a "Critically weak — matches a top-100k common password" warning, *in addition to*, not instead of, the existing `/api/analyze` scoring.
- If negative: proceed as normal; this does **not** mean the password is safe, only that it's not in the top-100k common list. The existing HIBP breach check (Section 1.6) remains the authoritative check for actual breach exposure.
- This check must run in under ~5ms client-side and must not block typing/input responsiveness.

### 1.4 Data Source (must be free, no payment, clear license)
- Use a **top-100k common password list from a permissively licensed, public source** — e.g., Daniel Miessler's [SecLists](https://github.com/danielmiessler/SecLists) repository, which is MIT-licensed and includes ranked common-password lists derived from public breach corpora. Confirm the specific file's license note in SecLists before bundling (SecLists itself is MIT; some sub-lists carry their own attribution notes — check and preserve any required attribution in `THIRD_PARTY_NOTICES.md`).
- Do **not** use any paid or gated password-list product (e.g., commercial breach-intelligence feeds).
- The list is bundled at **build time only** — never fetched at runtime from a third party, which also avoids a supply-chain/availability dependency in production.

### 1.5 Implementation Approach
1. **Build-time script** (Node or Python, run once, not at request time): read the top-100k list, construct a Bloom filter bit array sized for an acceptable false-positive rate (target ≤1%), serialize it to a compact static asset (e.g., a `.bin` or base64-encoded `.json` file, roughly 100–150KB depending on false-positive tuning).
2. **Library choice**: use a free, open-source (MIT/BSD/Apache-licensed) npm package such as `bloom-filters` (MIT license, no cost) for both the build-time construction and the runtime query logic, so the bit-level format matches on both ends. A custom MurmurHash3 implementation is a valid zero-dependency alternative if you'd rather avoid adding a runtime package — either is acceptable; default to the library for speed of implementation.
3. **Runtime**: load the static asset once on app start (Vite static asset import), deserialize into an in-memory filter object, and query it synchronously on each debounced input change.
4. **No server involvement**: this entire feature is client-only. No new backend endpoint is needed.

### 1.6 Relationship to Existing Checks (avoid duplication)
CipherGuard already has a server-side "common password / dictionary" check (top-10k list, part of `/api/analyze`) and the HIBP breach-check flow. To avoid confusing, redundant, or contradictory signals:
- The Bloom filter is explicitly framed in the UI as an **instant, client-side, zero-network pre-check**, distinct from the authoritative server-side dictionary check and the HIBP breach check.
- If both the Bloom filter and the server-side dictionary check flag the same password, show one consolidated warning, not two separate redundant ones.
- Do not remove or replace the existing server-side top-10k check — the Bloom filter is a *faster, larger, earlier* signal, not a replacement. (Optionally, in a later cleanup, the server-side list could be upgraded to match the same 100k source for consistency — flag this as a follow-up idea, not required for v1.3.)

### 1.7 Testing
- Unit test: known common passwords (`123456`, `password`, `qwerty`) return positive.
- Unit test: a freshly generated random/Diceware password (from the existing generator) returns negative with overwhelming probability — run this many times in CI to catch regressions in filter construction, not just once.
- Test that the false-positive rate of the built filter is within the target threshold (measurable at build time against a held-out sample).
- Test that the check runs client-side with **zero network requests** — assert on request logs/mocked fetch in tests.

---

## 2. Feature 2: Time-to-Crack / Offline Attack Simulator

### 2.1 Problem
A raw score (e.g., "82/100") is abstract. Showing an estimated crack time makes the risk concrete and is a well-understood pattern (zxcvbn, Bitwarden, Kaspersky all do variations of this).

### 2.2 User Story
As a user, I want to see roughly how long my password would take to crack under different attack scenarios, so I understand what "strong" actually means in practice.

### 2.3 Behavior
- Given the password's estimated entropy in bits ($H$, already computed for the strength meter and generator), compute the size of the search space: $S = 2^H$.
- Divide by a small set of standard guess-rate benchmarks and display each as a human-readable duration:

| Scenario | Guess rate | Notes |
|---|---|---|
| Online, throttled | 100 guesses/sec | Typical rate-limited web login form |
| Online, unthrottled | 10,000 guesses/sec | API without effective rate limiting |
| Offline, fast hash (SHA-1/MD5) | $10^{11}$ hashes/sec | Modern multi-GPU rig, unsalted/fast hash |
| Offline, slow hash (bcrypt/Argon2) | $10^{4}$ hashes/sec | Memory-hardened KDF, properly configured |

- Format output in human units: seconds → minutes → hours → days → years → centuries, picking the largest sensible unit (e.g., "3 seconds" not "0.00000009 centuries").
- **Important disclaimer, shown directly in the UI, not just in docs**: this is a theoretical estimate assuming brute-force search of the *entire* space at the stated rate — it does not account for whether the password matches a common pattern/dictionary word (which the analyzer/Bloom filter already catches separately, and which would make real-world cracking far faster than this math suggests). Also note explicitly that **CipherGuard has no way of knowing how the password will actually be stored by whatever service the user uses it on** — the "offline slow hash" row is a best case that only applies if that service uses a strong KDF correctly; many don't. Frame the four rows as a **range**, not a prediction, to avoid giving false confidence.

### 2.4 Implementation Approach
- Pure math, no external dependency required beyond what's already used for entropy calculation.
- Can run entirely client-side (reuse the entropy value already surfaced by the analyzer/generator) — no new backend endpoint needed, keeping this consistent with Feature 1's zero-network approach.
- Implement as a small, independently unit-testable utility function: `estimateCrackTimes(entropyBits) -> { onlineThrottled, onlineUnthrottled, offlineFast, offlineSlow }`, each a formatted duration string.

### 2.5 Testing
- Unit tests across a range of entropy values (very low, medium, very high) confirming correct duration formatting and correct unit selection (seconds vs. centuries, etc.).
- Edge case: extremely high entropy (e.g., 128+ bits) should format sensibly (e.g., "trillions of years" or a capped "effectively uncrackable" label) rather than producing an absurd unformatted huge number.
- Edge case: entropy of 0 or near-0 should not divide-by-zero or crash.

---

## 3. Phased Implementation Plan

### Phase 1 — Local Bloom Filter Pre-Check
**Scope**: Section 1 in full (data sourcing, build-time asset generation, client-side integration, UI warning, tests).
**Does not touch**: backend endpoints, existing server-side dictionary check logic (only documents the relationship, doesn't change it).
**Exit criteria**: filter asset built and checked into the repo (or generated via a documented build step), client-side check working with zero network calls, all tests in 1.7 passing, existing v1.0–v1.2 test suite still green.
**⛔ Do not start until explicitly told to begin Phase 1.**

### Phase 2 — Time-to-Crack Simulator
**Scope**: Section 2 in full.
**Does not touch**: any existing endpoint contracts; purely additive display logic reusing existing entropy values.
**Exit criteria**: utility function implemented and unit-tested per 2.5, UI display added with the required disclaimer text, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 2.** (Independent of Phase 1 — can be done first, after, or in parallel if you authorize both.)

### Phase 3 — Consolidation & Documentation
**Scope**:
- Update `README.md`: document both features, the zero-network nature of the Bloom filter check, and the disclaimer language for the crack-time estimator.
- Update `SECURITY.md`: add a note that the Bloom filter asset is a static, build-time-only artifact (no runtime fetch, no third-party network dependency at runtime), and that the crack-time estimator performs no network calls and stores nothing.
- Add `THIRD_PARTY_NOTICES.md` (or extend an existing one) crediting the source of the top-100k password list per its license terms.
- Add both features to the version changelog as v1.3.
**⛔ Do not start until explicitly told to begin Phase 3.**

---

## 4. Non-Goals (v1.3)

- Not replacing the existing HIBP breach-check flow — the Bloom filter is a faster *pre-check*, not a substitute for real breach data.
- Not implementing a full zxcvbn-style pattern-matching engine (keyboard walks, l33t-speak substitution, etc.) — entropy stays a simple character-class-based estimate as it is today, unless a future PRD scopes that separately.
- Not persisting crack-time estimates or Bloom filter match results anywhere (consistent with the project's existing no-persistence guarantee).

---

## 5. Acceptance Criteria (v1.3 overall)

- Both features function with **zero network calls** at runtime for their own logic (Bloom filter query and crack-time math are 100% client-side and offline-capable).
- No paid service, paid API tier, paid dataset, or paid library is introduced anywhere in this scope (see Section 6 checklist).
- Phase 1 and Phase 2 are each independently revertible without affecting the other or the existing v1.0–v1.2 core.
- No phase begins without an explicit go-ahead in conversation, per Section 0.
- `README.md` and `SECURITY.md` updates (Phase 3) ship in the same release, not as an unscoped follow-up.

---

## 6. Zero-Cost Dependency Checklist

Every dependency introduced in this PRD must be verified against this table before use. Do not add anything not listed here without updating this table first and confirming it's free.

| Dependency | Purpose | Cost | License |
|---|---|---|---|
| SecLists top-100k password list (or equivalent public list) | Bloom filter source data | Free | MIT (verify sub-list attribution) |
| `bloom-filters` npm package (or custom MurmurHash3) | Bloom filter construction/query | Free | MIT |
| Existing entropy calculation (already in codebase) | Crack-time math input | Free | N/A (internal code) |
| Vite static asset handling | Serving the Bloom filter asset | Free (already in stack) | N/A |

No new backend service, no new third-party API, no HIBP-style network dependency is introduced by either feature in this PRD.
