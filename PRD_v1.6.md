# PRD — CipherGuard v1.6
## Breach-Leak Exposure Timeline + Password Policy Compatibility Generator

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.6 |
| Depends on | v1.0 core generator (Feature 2 extends it directly). Feature 1 is standalone. |
| Hard constraint | **Zero-cost only.** Feature 1 in particular must not become a live personal breach lookup — see Section 1.2, this is the one place in this PRD where scope creep would introduce real cost. |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 0. How Phasing Works for This PRD (read first)

Same protocol as v1.3–v1.5: nothing below begins until you explicitly say so (e.g., "begin Phase 1"). No auto-continuation between phases.

| Phase | Feature | Trigger phrase (example) |
|---|---|---|
| Phase 1 | Breach-Leak Exposure Timeline (static dataset) | "Begin Phase 1" |
| Phase 2 | Password Policy Compatibility Generator | "Begin Phase 2" |
| Phase 3 | Consolidation & documentation | "Begin Phase 3" |

Phases 1 and 2 are independent and can be built in either order.

---

## 1. Feature 1: Breach-Leak Exposure Timeline (Historical Dataset)

### 1.1 What This Feature Actually Is (scope clarification, read before building)

This is an **educational, historical reference tool** — a browsable timeline of well-known, publicly reported breaches (Yahoo, LinkedIn, Adobe, Canva, etc.) showing roughly when they happened, how large they were, and what hashing practices were common at the time, to illustrate how password-storage practices have evolved. It is **not** a personal exposure checker — the user isn't searching "was my email/domain breached," they're browsing a static reference dataset.

### 1.2 Critical Cost/Scope Boundary

The feature name mentions "Domain/Breach Timeline," which could easily drift toward "let the user search whether *their* email or domain was breached." **Do not build that.** Have I Been Pwned's per-email/domain breach-search API (as opposed to the free password range API CipherGuard already uses) requires a **paid API key** as of HIBP's current pricing model — building a live per-user domain/email lookup would violate this project's zero-cost constraint and would also reintroduce exactly the kind of personal-data-over-the-network risk this whole app has been designed to avoid. If personal breach lookup is ever wanted in the future, that's a distinct, deliberate decision (with a real cost) for its own PRD — it is explicitly **out of scope** here. Confirm this boundary before starting Phase 1.

### 1.3 Behavior
- A static, scrollable/filterable timeline UI showing entries like:
  - Breach name, approximate year, approximate number of accounts affected, hashing/storage method reportedly used at the time (e.g., "unsalted MD5," "SHA-1," "bcrypt"), and a one-line note on significance (e.g., "one of the first breaches to popularize mandatory password resets industry-wide").
- Optional light filtering/sorting (by year, by hash algorithm used, by breach size) — pure client-side array filtering, no backend needed.
- Each entry should credit its public source (e.g., a link to a reputable public report) rather than presenting unsourced numbers as fact.

### 1.4 Data Sourcing & Accuracy Requirements

This is the part of the feature that actually takes real effort, and it's worth doing carefully rather than guessing:
- Every entry's figures (year, affected-account count, hashing method) must be **checked against a specific, citable public source** (breach-notification archives, reputable security-news coverage, the affected company's own disclosure) at the time this is built — not filled in from general impression/memory, since specific breach statistics are exactly the kind of detail that's easy to misremember or conflate between similar incidents.
- Where reported figures vary between sources (common for older breaches), state a range or note the discrepancy rather than picking one number silently.
- Keep each entry's text short and in original wording — this is a factual summary dataset (facts/statistics themselves aren't copyrightable), not a reproduction of any single article's writing.
- Add a small disclaimer near the feature: "Figures are drawn from public reporting and may vary by source; this is an educational reference, not a real-time or authoritative breach registry."

### 1.5 Implementation Approach
- A single bundled static JSON file (e.g., `data/breach-timeline.json`), loaded as a static asset — no runtime fetch, no backend endpoint, no network call at all once bundled.
- Pure client-side rendering/filtering (React state, array `.filter()`/`.sort()`) — no new dependency needed for basic functionality; a lightweight charting library could be used for a visual timeline axis if desired, but plain HTML/CSS is enough for v1.6 and keeps the dependency count at zero.

### 1.6 Testing
- Test that the dataset loads and renders without a network call (mock fetch/XHR, assert none fired for this feature specifically).
- Test filtering/sorting logic against the bundled dataset (e.g., filtering by year range returns the expected subset).
- Manual review pass: spot-check a sample of entries against their cited sources before shipping, per 1.4.

---

## 2. Feature 2: Password Policy Compatibility Generator

### 2.1 Problem
Many real-world sites impose awkward legacy password rules (odd length caps, restricted symbol sets, "exactly one special character," etc.). The existing generator doesn't accommodate that, so users end up hand-editing a generated password to fit — often weakening it in the process.

### 2.2 Behavior
Extend the **existing** generator component (v1.0) with a rule-builder panel:
- **Length constraints**: min and max (validate min ≤ max; reject nonsensical ranges with a clear inline error rather than silently generating something wrong).
- **Explicit allowed/disallowed character sets**: e.g., "no `&` or `<`," or "only these symbols: `! @ # $`." Support both an allow-list and a block-list mode.
- **Exact-count constraints** (common in legacy policies): e.g., "exactly 1 special character," "at least 2 digits" — the generator must satisfy these exactly, not just "at least roughly."
- **"Memorable Pronounceable" mode**: generate using an alternating consonant–vowel pattern (e.g., `CVCVCV` or similar) so the output is easier to say/remember, optionally with digits/symbols appended rather than interspersed (to keep the pronounceable core intact).

### 2.3 Honesty About Entropy Trade-offs (important)
Rule-constrained and pronounceable-mode passwords are **necessarily lower entropy per character** than the existing fully-random generator output — a restrictive legacy policy or a CV-pattern structure both shrink the effective search space. This must be surfaced honestly, not glossed over:
- Continue showing the existing entropy calculation for whatever the actual constrained/pronounceable output ends up being (reuse existing entropy math, computed against the *actual* character pool and structure used, not the unconstrained default).
- If a policy's constraints force entropy below a sensible threshold (e.g., under ~40 bits), show a plain-language note: "This site's password policy limits how strong a password can be here — consider a passphrase for your master accounts elsewhere, or ask the site to modernize its rules." Attribute the limitation to the external policy, not to CipherGuard.
- Pronounceable mode should be labeled clearly as "easier to remember, lower entropy per character than random — use extra length to compensate," with the option to increase length prominently offered.

### 2.4 Validation & Edge Cases
- Reject/flag impossible rule combinations before attempting generation (e.g., max length shorter than the sum of required exact-count characters) with a clear error, rather than looping indefinitely or silently producing an invalid result.
- Custom disallowed-character input from the user (typed into the rule builder) is only ever used as client-side string-filtering data — no `eval`, no dynamic code construction from it, consistent with the project's existing "no dynamic code execution" rule.
- Generation must still use the CSPRNG (`secrets`/`crypto.getRandomValues`, whichever the existing generator already uses) for all random choices, including within pronounceable-mode syllable selection — no `Math.random()`/non-cryptographic fallback anywhere in this feature.

### 2.5 Implementation Approach
- Extends the **existing** generator component and its existing secure-random code path — this should not require a new backend endpoint if the current generator is already client-side; if the current generator is server-side (per earlier `/api/generate`), extend that endpoint's parameters additively (new optional fields), keeping old calls backward-compatible, consistent with how v1.2's Diceware mode was added.
- Consonant/vowel table for pronounceable mode is a small, hand-authored static data structure — no external dependency needed.

### 2.6 Testing
- Unit tests: generated output always satisfies every active constraint (length bounds, exact-count rules, allow/block lists) across many randomized runs, not just one example.
- Unit test: impossible rule combinations are rejected with a clear error, not an infinite loop or a silently-wrong password.
- Unit test: pronounceable mode never uses a non-CSPRNG random source (can be checked by mocking the RNG and asserting the secure source is what's called).
- Backward-compatibility test: existing default generation (no custom rules set) behaves identically to pre-v1.6.

---

## 3. Phased Implementation Plan

### Phase 1 — Breach-Leak Exposure Timeline
**Scope**: Section 1 in full, including the scope boundary in 1.2 and sourcing requirements in 1.4.
**Exit criteria**: static dataset bundled and sourced per 1.4, zero network calls confirmed, filtering/sorting tested, disclaimer copy present, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 1.**

### Phase 2 — Password Policy Compatibility Generator
**Scope**: Section 2 in full.
**Exit criteria**: rule-builder UI wired to generator, all constraint-satisfaction tests passing, entropy-honesty messaging in place per 2.3, backward compatibility with pre-v1.6 default generation confirmed, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 2.**

### Phase 3 — Consolidation & Documentation
**Scope**:
- Update `README.md`: document the breach timeline's scope (historical/educational, not a personal lookup tool) and the new policy rule-builder options.
- Update `SECURITY.md`: note that the breach timeline is a static, offline, zero-network dataset, and explicitly record the decision *not* to implement live per-email/domain breach lookup (and why — cost and privacy), so this boundary is documented rather than just implicit in this PRD.
- Add both features to the version changelog as v1.6.
**⛔ Do not start until explicitly told to begin Phase 3.**

---

## 4. Non-Goals / Known Limitations (v1.6)

- No personal email/domain breach lookup — explicitly out of scope, see 1.2.
- No live/updating breach feed — the dataset is static and will go stale over time; a future refresh is a maintenance task, not a real-time feature.
- Pronounceable-mode passwords are not claimed to be as strong per-character as fully random output — this is disclosed, not hidden.
- Policy rule-builder doesn't attempt to detect or bypass CAPTCHA-style or server-side validation quirks of any real external site — it only encodes the rules the user manually enters.

---

## 5. Acceptance Criteria (v1.6 overall)

- Breach timeline uses a static bundled dataset only — zero runtime network calls, and no live personal breach-lookup capability anywhere in the feature.
- Every dataset entry is traceable to a cited public source; discrepancies between sources are noted rather than silently resolved.
- Policy-constrained and pronounceable-mode generation always satisfies the active constraints and always uses a CSPRNG.
- Entropy trade-offs of constrained/pronounceable generation are shown honestly in the UI, not just in this doc.
- No paid service, paid API, or paid library is introduced anywhere in this scope (Section 6).
- No phase begins without an explicit go-ahead in conversation.
- `README.md` and `SECURITY.md` updates (Phase 3) ship in the same release.

---

## 6. Zero-Cost Dependency Checklist

| Dependency | Purpose | Cost | License |
|---|---|---|---|
| Bundled static JSON dataset (self-compiled, cited sources) | Breach timeline data | Free (self-authored, factual data) | N/A |
| Existing v1.0 secure generator code path (`secrets`/`crypto.getRandomValues`) | Policy-compatible & pronounceable generation | Free (already built) | N/A |
| Hand-authored consonant/vowel table | Pronounceable mode | Free (self-authored, no external source) | N/A |
| Native React/CSS rendering, array filter/sort | Timeline UI, rule-builder UI | Free (already in stack) | N/A |

**Explicitly not used**: HIBP's paid per-account/domain breach-search API — confirmed out of scope for this PRD (Section 1.2). No new backend service and no new third-party network dependency is introduced by either feature.
