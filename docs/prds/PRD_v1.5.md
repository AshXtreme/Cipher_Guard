# PRD — CipherGuard v1.5
## Visual Password Entropy Heatmap + Offline Vault Export

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Target Release | v1.5 |
| Depends on | v1.0–v1.4 core. Feature 4's KDF step can reuse the PBKDF2 code path already built in v1.4's Hashing Lab (Web Crypto `deriveBits`) — see Section 2.4. |
| Hard constraint | **Zero-cost only** — no paid APIs, paid tiers, or paid libraries. Feature 4 is a genuine new risk surface (data leaving the browser as a file); it gets extra scrutiny in Section 2. |
| Companion docs to update | `SECURITY.md`, `README.md` |

---

## 0. How Phasing Works for This PRD (read first)

Same protocol as v1.3/v1.4: nothing below begins until you explicitly say so (e.g., "begin Phase 1"). No auto-continuation between phases — treat each boundary as a hard stop, especially Phase 3 below, which is opt-in by design given its risk profile.

| Phase | Feature | Trigger phrase (example) |
|---|---|---|
| Phase 1 | Visual Entropy Heatmap & Character Breakdown | "Begin Phase 1" |
| Phase 2 | Encrypted Vault Export (JSON, AES-GCM) | "Begin Phase 2" |
| Phase 3 | Optional plaintext CSV export (Bitwarden/1Password compatibility) | "Begin Phase 3" |
| Phase 4 | Consolidation & documentation | "Begin Phase 4" |

**Phase 3 is intentionally separated from Phase 2** and should be treated as a distinct decision, not a default extension of it — see Section 2.5 for why.

---

## 1. Feature 3: Visual Password Entropy Heatmap & Character Breakdown

### 1.1 Problem
A numeric score is abstract; seeing *which characters* are weak/strong at a glance is more actionable and visually engaging.

### 1.2 Behavior
- As the user types in the main password field, an inline overlay color-codes each character in real time:
  - 🟢 Green — symbols/special characters
  - 🔵 Blue — mixed-case letters (contributes more if both cases are present in the password overall, not just per-character)
  - 🟡 Yellow — numbers
  - 🔴 Red — characters that are part of a flagged common-dictionary substring, a sequential run (`123`, `abc`), or a repeated run (`aaa`)
- A small legend/key is shown near the field so the mapping is discoverable without guessing.

### 1.3 Important Security/Privacy Consideration (this is the part worth stopping on)

Coloring **individual masked characters** (the dots shown in a `type="password"` field) by category is itself a partial information leak: even though the actual characters stay hidden, an onlooker (shoulder-surfing) could infer the *pattern* — e.g., "green-green-blue-blue-blue-yellow-yellow" — which meaningfully narrows a guessing attack even without seeing the literal characters. This wasn't in the original feature request but is a direct consequence of "render this over the input in real time," so it needs an explicit design decision:

**Resolution for v1.5**: the **per-character positional overlay only renders when the password is in its unmasked/"show password" state** (the user has explicitly clicked to reveal it — an action that already accepts some shoulder-surfing risk, consistent with existing show/hide behavior elsewhere in the app). **While masked (default state), show an aggregate, non-positional summary instead** — e.g., small count badges ("🟢×2 🔵×5 🟡×3 🔴×0") with no per-character color-to-position mapping. This gives the same at-a-glance feedback without leaking character-order information while the field is meant to be hidden.

### 1.4 Accessibility
- Color must not be the only signal: pair each category with a distinct icon or pattern (e.g., a small glyph under each colored segment) and ensure the legend is readable via screen reader (proper `aria-label`s), consistent with the project's existing "meter also expressed as text" principle.
- Verify sufficient contrast for each of the four colors against both light and dark theme backgrounds if the app supports both.

### 1.5 Implementation Approach
- **Pure frontend, no backend involvement, no network calls** — a classic "transparent input + mirrored styled div behind it" technique: an invisible/transparent-text `<input>` sits on top of a `<div>` that renders the same string as colored `<span>`s, with font, size, letter-spacing, and padding kept pixel-identical between the two so the overlay lines up exactly. This is the same technique used by things like Draft.js-style highlighted inputs.
- Classification logic reuses the **existing** per-character regex checks and common-substring/sequential/repeated detection already built for the analyzer (v1.0) — no new detection logic, just a new rendering layer over data already being computed.
- No new dependency required; if a battle-tested masked-highlight-input pattern is preferred over hand-rolling the overlay, a small free MIT-licensed React library can be used instead — confirm license before adding.

### 1.6 Testing
- Unit/visual test: overlay renders correct color for each character class across a range of sample strings, including edge cases (empty string, all-symbols, all-repeated).
- Test that the masked state shows only the aggregate summary, never a positional color mapping (this is the one to be strict about, given 1.3).
- Test that overlay and underlying input never desync in length/position under rapid typing, paste, or deletion.

---

## 2. Feature 4: Offline Vault Export (Encrypted JSON, with optional plaintext CSV compatibility)

### 2.1 Problem
Users who generate a strong password/passphrase in CipherGuard currently have to copy it out one at a time. A local export lets them save several generated credentials to their own machine.

### 2.2 Framing: this is a deliberate, user-initiated exception to "we never persist anything"
Every other CipherGuard feature to date has been built around a hard "nothing is ever persisted" guarantee. This feature is different **by explicit user request and action** — the user is choosing to write secret material to their own disk. That's a legitimate use case, but it must be:
- Fully client-side (no backend involvement, no network call — the file never leaves the browser except via the browser's own download mechanism to the user's local disk).
- Opt-in per export action, never automatic or silent.
- Clearly and separately documented in `SECURITY.md` as a scoped exception, not folded quietly into the existing "no persistence" language.

### 2.3 Default Behavior: Encrypted JSON Export
- User selects one or more generated passwords/passphrases (from the current session — nothing pulled from any history/storage feature, consistent with v1.2's memory-only comparison tool) to include in an export.
- User sets a **master export passphrase** (used only for this export, not stored anywhere, not the same as any of the exported passwords).
  - Run the **existing entropy/strength display** (from the core analyzer) against this master passphrase too, and warn if it's weak — the whole export is only as safe as this one passphrase.
- Derive an encryption key from the master passphrase using **PBKDF2 via Web Crypto's `deriveBits`** (same native, free, zero-dependency approach already built for v1.4's Hashing Lab — this phase can literally reuse that code path) with a random salt and a high iteration count (consistent with the app's existing PBKDF2 defaults).
- Encrypt the export payload with **AES-GCM** via `crypto.subtle.encrypt` (native, free, and authenticated — meaning tampering is detectable, not just confidentiality).
- Bundle salt, IV, and ciphertext into a single JSON file; trigger the download via `URL.createObjectURL(new Blob(...))` (native, free, no backend involved).
- **This is export-only in v1.5** — there is no corresponding "import/decrypt" UI yet. Document this clearly as a known limitation (Section 4) rather than implying full round-trip vault functionality; a decrypt/import companion feature is a reasonable candidate for a future PRD, not assumed here.

### 2.4 Reuse Note
The PBKDF2 derivation and Web Crypto patterns from v1.4 Phase 1 (Hashing & KDF Lab) should be reused here rather than reimplemented — same native API, same iteration-count reasoning, just applied to actual encryption instead of demonstration. If v1.4 Phase 1 hasn't shipped yet, this phase either re-implements the (small) shared utility itself or waits — flag this dependency back to the user rather than guessing.

### 2.5 Optional: Plaintext CSV Export (Bitwarden/1Password compatibility) — separately gated, higher risk

This is split into its own phase (Phase 3) rather than bundled with the encrypted export, for a specific reason: **Bitwarden and 1Password's standard CSV import formats are plaintext by definition** — that's how those tools' import pipeline works, and CipherGuard can't change that. Offering this format means deliberately writing unencrypted passwords to a file in the user's downloads folder, which:
- May get picked up by cloud-sync tools (OneDrive, Dropbox, iCloud Drive) and uploaded automatically, entirely outside CipherGuard's control.
- Sits in plaintext on disk indefinitely if the user forgets to delete it after importing elsewhere.

**If Phase 3 is authorized**, it must include, non-negotiably:
- A distinct, explicit confirmation step separate from the encrypted export flow — e.g., a checkbox or typed confirmation: "I understand this file will contain my passwords in plain, unencrypted text."
- Prominent in-UI guidance: "Delete this file as soon as you've imported it elsewhere. Avoid saving it in a cloud-synced folder."
- The CSV column schema should be verified against Bitwarden's and/or 1Password's **current, official** import documentation at implementation time (these formats can change) rather than assumed from memory — a quick doc check before writing the CSV-generation code.
- No password field of the encrypted export flow (2.3) should be silently reused/duplicated into this path without going through the same explicit confirmation.

If, after reading this, the plaintext path isn't worth the added risk for a portfolio project, it's entirely reasonable to skip Phase 3 and ship only the encrypted JSON export — that's a legitimate scope decision, not a compromise.

### 2.6 Testing
- Unit test: encrypt-then-decrypt round trip (using the same derivation) produces the original data — proves the encryption logic is internally correct even without a UI-level import feature yet.
- Unit test: a wrong master passphrase fails to decrypt (AES-GCM's authentication tag correctly rejects tampered/incorrect-key data) rather than silently producing garbage.
- Unit test: zero network calls triggered anywhere in the export flow (mock fetch/XHR, assert none fired).
- If Phase 3 is built: test that the CSV path cannot be reached without the explicit confirmation step having fired first.

---

## 3. Phased Implementation Plan

### Phase 1 — Visual Entropy Heatmap & Character Breakdown
**Scope**: Section 1 in full, including the masked/unmasked resolution in 1.3.
**Exit criteria**: overlay renders correctly and stays in sync with input, masked-state shows aggregate-only (no positional leak), accessibility pass complete, existing test suite still green.
**⛔ Do not start until explicitly told to begin Phase 1.**

### Phase 2 — Encrypted Vault Export (JSON, AES-GCM)
**Scope**: Section 2.3–2.4 and 2.6 (excluding the plaintext CSV path).
**Exit criteria**: encrypt/decrypt round-trip test passes, wrong-passphrase rejection test passes, zero network calls confirmed, master-passphrase strength check wired to existing analyzer, `SECURITY.md` addendum drafted (finalized in Phase 4).
**⛔ Do not start until explicitly told to begin Phase 2.**

### Phase 3 — Optional Plaintext CSV Export (Bitwarden/1Password compatibility)
**Scope**: Section 2.5 in full.
**This phase is opt-in at the PRD level, not just the implementation level** — confirm you actually want this before triggering it, given the risk profile discussed above. It's entirely valid to stop at Phase 2.
**Exit criteria**: explicit confirmation gate verified via test, CSV schema verified against current official docs, in-UI deletion/cloud-sync warning present.
**⛔ Do not start until explicitly told to begin Phase 3 — and consider this confirmation distinct from a general "continue with the PRD" instruction, given Section 2.5.**

### Phase 4 — Consolidation & Documentation
**Scope**:
- Update `README.md`: document the heatmap's masked-vs-unmasked behavior, the encrypted export format, and (if built) the plaintext CSV path with its warnings.
- Update `SECURITY.md`: add the export feature as an explicit, scoped exception to the no-persistence guarantee (Section 2.2), document the AES-GCM/PBKDF2 parameters used, and if Phase 3 shipped, document the plaintext-CSV risk and mitigations directly rather than leaving it implicit.
- Add both features to the version changelog as v1.5.
**⛔ Do not start until explicitly told to begin Phase 4.**

---

## 4. Non-Goals / Known Limitations (v1.5)

- No import/decrypt UI for the encrypted export in v1.5 — export only. A round-trip vault experience is a reasonable future PRD, not assumed here.
- No cross-device sync, no cloud backup of any export — purely local file download.
- The heatmap's dictionary/sequential/repeated detection is exactly as accurate as the existing v1.0 analyzer logic — this feature doesn't improve detection, only visualizes it.
- CipherGuard cannot control what happens to an exported file after it leaves the browser (cloud sync, backup tools, etc.) — this is stated as a limitation, not solved by the app.

---

## 5. Acceptance Criteria (v1.5 overall)

- Heatmap never reveals per-character positional information while the password field is masked.
- Vault export runs with **zero network calls** at every step.
- Encrypted export uses authenticated encryption (AES-GCM) with a passphrase-derived key (PBKDF2 via Web Crypto) — never a hardcoded or weak key.
- Plaintext CSV export (if built) is gated behind an explicit, separate confirmation and cannot be reached accidentally.
- No paid service, paid API, or paid library is introduced anywhere in this scope (Section 6).
- No phase begins without an explicit go-ahead in conversation, and Phase 3 specifically is treated as its own decision, not an automatic continuation of Phase 2.
- `README.md` and `SECURITY.md` updates (Phase 4) ship in the same release as whichever phases were built.

---

## 6. Zero-Cost Dependency Checklist

| Dependency | Purpose | Cost | License |
|---|---|---|---|
| Native CSS/React rendering | Heatmap overlay | Free (already in stack) | N/A |
| Existing v1.0 analyzer detection logic | Character classification for heatmap | Free (already built) | N/A |
| `window.crypto.subtle` — PBKDF2 (`deriveBits`) | Key derivation for vault export | Free (native browser API) | N/A |
| `window.crypto.subtle` — AES-GCM (`encrypt`) | Vault export encryption | Free (native browser API) | N/A |
| `URL.createObjectURL(new Blob(...))` | Triggering the local file download | Free (native browser API) | N/A |
| (Optional, Phase 1) small MIT-licensed highlighted-input library, if used instead of hand-rolled overlay | Heatmap rendering convenience | Free | MIT (verify before adding) |

No new backend service and no new third-party network dependency is introduced by either feature in this PRD. Everything runs natively in the browser.
