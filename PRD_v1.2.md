# PRD — CipherGuard v1.2
## Password Health History, Diceware Passphrases & Auto-Expiring Clipboard

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.2 (additive, non-breaking) |
| Depends on | CipherGuard v1.0/v1.1 core (analyze, breach-check, generate) |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 1. Overview

v1.2 adds three UX-facing features on top of the existing analyzer/breach-check/generator core:

1. **Password Health Comparison Tool** — compare 2–3 candidate passwords side-by-side (entropy, rule checks, breach status).
2. **Diceware Passphrase Generator** — an alternative generation mode using EFF word lists.
3. **Auto-Expiring Copy Buffer** — a countdown after copying a generated password/passphrase, after which the app attempts to clear the clipboard.

All three are **additive UI/UX features**, not changes to the core scoring or breach-check logic. They should not require modifying `/api/analyze`, `/api/breach-check`, or `/api/generate` contracts — see Section 5 for how each maps to new vs. existing endpoints.

---

## 2. Important Security Note (read before building)

CipherGuard's existing `SECURITY.md` states a hard guarantee: **no password is stored in any form, anywhere, at any time** (Section 2, "Data Classification": high-sensitivity password data is never persisted). The Comparison Tool as proposed ("using `localStorage` or session state") is in tension with that guarantee if implemented naively — `localStorage` is:
- Persistent across browser restarts (survives tab close, unlike memory).
- Readable by any script running on the same origin (i.e., vulnerable if an XSS bug is ever introduced elsewhere in the app).
- Not encrypted at rest by the browser.

**Recommendation**: implement the comparison tool using **in-memory React state only** (cleared on page refresh/navigation), *not* `localStorage`, so the existing "no persistence" guarantee holds without needing an exception. If persistence across a page refresh is genuinely required, `sessionStorage` (cleared when the tab closes) is a smaller exception than `localStorage` — but this PRD's default recommendation is **memory-only, no browser storage API at all**, with an explicit UI disclaimer either way. This decision must be reflected in an update to `SECURITY.md`'s data classification table (Section 5.4 below).

---

## 3. Goals & Non-Goals

### Goals
- Let users compare candidate passwords/passphrases without settling for the first result.
- Offer passphrases (Diceware) as a memorable, high-entropy alternative to random strings.
- Reduce clipboard-based credential leakage on shared/compromised machines.
- Ship all three features without destabilizing the existing v1.0/v1.1 core — each is independently toggleable and independently shippable.

### Non-Goals
- No server-side storage of any password, passphrase, or comparison history (unchanged from v1.0 guarantee).
- No account system or cross-device sync of comparisons/history.
- No cryptographic guarantee on clipboard clearing — browser clipboard APIs have real limitations (see Section 4.3); the feature is a best-effort mitigation, not a hard guarantee, and must be worded that way in the UI.

---

## 4. Feature Specifications

### 4.1 Password Health History & Comparison Tool

**User story**: As a user, I want to compare 2–3 candidate passwords side-by-side so I can pick the strongest one instead of settling for the first result.

**Behavior**:
- User can add up to 3 candidate passwords (typed or generated) to a comparison tray.
- Each candidate is run through the **existing** `/api/analyze` and `/api/breach-check` flows (no new backend logic needed) and displayed side-by-side: score, label, per-check breakdown, entropy estimate, breach status.
- Comparison state lives in **in-memory client state only** (React state / a context, not `localStorage`/`sessionStorage` by default).
- A **persistent, dismissible privacy banner** is shown above the comparison tray whenever it contains data:
  > "Comparison data is kept in memory only and is cleared when you refresh or leave this page. It is never sent anywhere except for the same strength/breach checks used elsewhere in this app."
- "Clear all" button, and auto-clear on tab close/navigation (default browser behavior for in-memory state — no extra code needed, which is itself a benefit of this approach).
- **If** the team later decides persistence across refresh is a hard requirement: gate it behind an explicit, unchecked-by-default opt-in toggle ("Remember my comparison across refreshes on this device"), use `sessionStorage` (not `localStorage`), and update `SECURITY.md` to document this as a scoped, opt-in exception with its own risk note.

**Out of scope for v1.2**: no "history" of past sessions, no timestamps, no naming/labeling of saved comparisons — this is a single-session, ephemeral tray, not a saved log.

---

### 4.2 Diceware Passphrase Generator

**User story**: As a user, I want to generate a memorable passphrase instead of a random string, since passphrases are easier to recall correctly.

**Behavior**:
- New generation mode alongside the existing character-based generator: a mode toggle ("Random characters" / "Passphrase").
- Options: word count (default 6, matching EFF's ~77 bits of entropy guidance at 6 words for the long list), word list (EFF Short List, EFF Long List), separator (`-`, `_`, `.`, space).
- Uses Python's `secrets.choice()` (or equivalent CSPRNG) to select each word independently and uniformly — never `random`.
- Word lists are **bundled locally** in the repo (EFF's lists are public domain / CC-licensed and small — a few hundred KB) rather than fetched at runtime, so no network dependency and no risk of a compromised third-party list.
- Entropy is calculated and displayed: `H = words × log2(list_size)` — e.g., 6 words from the EFF long list (7,776 words) ≈ 77.5 bits.
- Passphrase output flows through the **same** copy-to-clipboard / auto-expiring buffer mechanism as random-character passwords (Section 4.3) — no separate code path needed there.

**Backend change**: extend the existing `/api/generate` endpoint with a `mode` parameter (`"random"` default, `"diceware"` new) rather than adding a new endpoint, to keep the API surface small. This must be backward-compatible: omitting `mode` must behave exactly as v1.0/v1.1 today.

---

### 4.3 One-Time Auto-Expiring Copy Buffer

**User story**: As a user on a shared or public machine, I want the clipboard to auto-clear after copying a password so it isn't left exposed indefinitely.

**Behavior**:
- On "Copy to Clipboard" click, copy the value via `navigator.clipboard.writeText(...)` as today, and start a visible countdown (default 30s, configurable 15–60s).
- When the countdown reaches zero, attempt `navigator.clipboard.writeText('')` to clear it — **only if the app can verify the clipboard still contains the value it copied**, to avoid the failure mode of overwriting something else the user copied in the meantime. Practical approach: browsers do not allow reading the clipboard without a fresh user gesture/permission in most cases, so the safest implementation is:
  1. Track a simple in-memory flag: "this app's most recent copy operation has not yet been superseded."
  2. If the user copies a *second* value (a new candidate or new generation) before the timer expires, cancel the pending clear for the first — the second copy already overwrote it.
  3. Clearing itself may silently fail depending on browser/OS clipboard permission state — this is expected and acceptable; the feature is best-effort.
- **UI must state the limitation honestly**, e.g.: "We'll try to clear your clipboard after 30s. This isn't guaranteed on every browser/OS — don't rely on it as your only protection on a shared device."
- No use of any physical/behavioral self-harm-adjacent gimmicks here obviously (not applicable) — just a straightforward timer UI (progress ring or countdown text) with a "cancel" option in case the user is still pasting.

**Explicitly not doing**: this feature does not read clipboard contents to verify what's in it (that would require broader clipboard-read permissions than needed and adds an unnecessary permission prompt) — it only ever writes.

---

## 5. Phased Implementation Plan (non-breaking, independently shippable)

Each phase should be its own PR/branch, fully tested and mergeable on its own, so the project is never left in a half-working state.

### Phase 0 — Groundwork (no user-visible change)
- Add a feature-flag mechanism (even a simple `VITE_FEATURE_*` env var per feature is enough — no need for a full flag service).
- Add frontend test scaffolding if not already present (per the gap noted in the current README).
- Confirm `/api/generate` request/response shapes are versioned or additive-safe before touching them in Phase 2.

**Exit criteria**: existing v1.0/v1.1 test suite still fully green; no behavior change.

### Phase 1 — Diceware Passphrase Generator
- Bundle EFF word lists; extend `/api/generate` with optional `mode` param (default unchanged).
- Add passphrase UI mode, entropy display.
- Tests: backward-compatibility test confirming old-style `/api/generate` calls (no `mode`) are byte-for-byte unchanged in response shape; new tests for passphrase entropy calculation and word-list bundling integrity (e.g., checksum the bundled list file).

**Exit criteria**: Phase 0 groundwork + Diceware mode ships behind its feature flag; old generator still default; can be merged and deployed independent of Phases 2–3.

### Phase 2 — Auto-Expiring Copy Buffer
- Add countdown UI + best-effort clipboard-clear logic to the *existing* copy button (used by both random and Diceware output from Phase 1).
- No backend change required — purely client-side.
- Tests: simulate copy → timer expiry → clear attempt; simulate copy → second copy before expiry → first clear cancelled; simulate clipboard API permission denial → app doesn't crash, shows fallback messaging.

**Exit criteria**: works identically whether Phase 1 shipped or not (it attaches to the pre-existing copy button either way) — so Phase 2 has no hard dependency on Phase 1 completing first, though shipping order 1→2 is recommended since it's the more foundational change.

### Phase 3 — Password Health Comparison Tool
- Add comparison tray UI, wire to existing `/api/analyze` and `/api/breach-check` (no backend change).
- In-memory-only state by default; privacy banner as specified in 4.1.
- Tests: verify no comparison data survives a simulated page reload (proves the "memory only" claim rather than just asserting it); verify the privacy banner renders whenever tray has ≥1 entry; verify "Clear all" fully resets state.

**Exit criteria**: fully additive — does not modify any existing endpoint or component contract, so it can be the last phase merged with the least regression risk.

### Rollback Safety
Because each phase is additive (new optional param, new UI mode behind a flag, new component), rolling back any single phase means reverting that phase's PR/flag — it should not require touching the other phases' code. No phase should modify the existing `/api/analyze` or `/api/breach-check` contracts at all.

---

## 6. Documentation Updates Required

- **`SECURITY.md`**:
  - Add a "v1.2 Data Classification Addendum" documenting the comparison tool's in-memory-only storage decision (or the scoped `sessionStorage` opt-in exception, if that path is chosen) — do not silently update the existing data classification table without a visible changelog entry.
  - Add a row to the security controls checklist for "clipboard auto-clear" noting it's best-effort, not a hard guarantee, and why (browser permission model).
  - Note that Diceware word lists are bundled locally, not fetched, and why (supply-chain / integrity reasons).
- **`README.md`**:
  - Document the new `mode` param on `/api/generate`.
  - Document the comparison tool and its privacy banner language.
  - Document the clipboard auto-clear feature and its stated limitation.
  - Update version badge/changelog to v1.2.

---

## 7. Acceptance Criteria (v1.2 overall)

- All three features ship behind independent flags; disabling all three flags reproduces v1.1 behavior exactly (verified by re-running the full v1.1 test suite with flags off).
- No password, passphrase, or comparison data is written to `localStorage` unless the team explicitly decides otherwise and updates `SECURITY.md` accordingly first.
- `/api/generate` remains backward-compatible for existing callers.
- Clipboard-clear limitation is stated in the UI, not just in docs.
- `SECURITY.md` and `README.md` are updated in the same release, not as a follow-up.
