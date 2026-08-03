# CipherGuard 🛡️
> 100% Zero-Knowledge Client-Side Password Security Analyzer, Generator & Vault Sandbox

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests: 67 Passed](https://img.shields.io/badge/Tests-67%20Passed-00ff66.svg)]()
[![Architecture: 100% Client--Side](https://img.shields.io/badge/Architecture-100%25%20Client--Side-blue.svg)]()

CipherGuard is a zero-knowledge, security-hardened web application designed to evaluate password strength, perform offline breach checking, generate cryptographically secure passwords, manage encrypted vault backups, and run WebAssembly cryptographic KDF benchmarks — **operating 100% in browser memory with zero network calls and zero server persistence.**

For the full threat model, data-handling guarantees, and security controls, see [`SECURITY.md`](./SECURITY.md).

---

## 🌟 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     BROWSER CLIENT (SPA)                                     │
│                                                                                             │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐  │
│  │   Live Strength Engine   │   │  Local Bloom Filter (0N) │   │  CSPRNG Policy Generator │  │
│  │   (Entropy & Heuristics) │   │  (100k Breach Dataset)   │   │  (Web Crypto API)        │  │
│  └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘  │
│               │                              │                              │                │
│  ┌────────────▼─────────────┐   ┌────────────▼─────────────┐   ┌────────────▼─────────────┐  │
│  │ AES-256-GCM Vault Import │   │ Argon2id Web Worker (0N) │   │ Offline 2FA/TOTP Sandbox │  │
│  │ & Export (PBKDF2-SHA256) │   │ (WebAssembly / WASM)     │   │ (Crypto CSPRNG & otplib) │  │
│  └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘  │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                   ZERO NETWORK CALLS — 100% OFFLINE
```

> **Zero-Knowledge Guarantee**: All password evaluation, entropy calculation, breach pattern matching, vault encryption/decryption, and WebAssembly hashing execute **100% in browser memory**. Plaintext passwords, master passphrases, and full hashes are **never transmitted over the network** or persisted in storage.

---

## 🚀 Key Modules & Feature Overview

CipherGuard features 12 integrated security modules operating purely client-side:

### 1. `MOD-01`: Live Analyzer Console
Real-time password evaluation calculating bit entropy ($H = L \log_2 N$), character pool distribution (lowercase, uppercase, digits, symbols), and visual LED score rating (0–100) as the user types.

### 2. `MOD-02`: Heuristics Breakdown
Interactive 7-rule security checklist evaluating length bounds ($\ge 12$), character class presence, dictionary immunity, and sequential pattern runs (`abc`, `123`, `qwerty`), accompanied by real-time security tips.

### 3. `MOD-03`: Tactile Generator Rack
Cryptographically secure password generator powered by `crypto.getRandomValues()` and an $O(N)$ **Fisher-Yates CSPRNG shuffle**. Supports 4 modes:
- **Random Characters**: Customizable length, numbers, symbols, and ambiguous character exclusion.
- **Diceware Passphrases**: EFF Large Wordlist passphrase generation with custom separators.
- **Policy Rules**: Exact exact-count constraints (symbols, digits, uppercase) and blocklists.
- **Memorable Pronounceable**: Alternating `CVC`/`CVCV` syllable structure with trailing digits/symbols.
- **Web Audio API Tactile Sound Engine**: Zero-dependency oscillator sound feedback (`ctx.createOscillator()`) triggered on keypress/click interactions, strictly adhering to browser autoplay policies (`AudioContext.resume()`).

### 4. `MOD-04`: Telemetry Terminal
Monospaced, real-time event log streaming local execution events, hash prefix computation logs, and Bloom filter match notifications.

### 5. `MOD-05`: Password Health Comparison Tool
Side-by-side health comparison matrix permitting evaluation of up to 3 candidate passwords simultaneously in temporary React state. Zero persistence to `localStorage` or `sessionStorage`.

### 6. `MOD-06`: Time-to-Crack Offline Simulator
Theoretical brute-force time-to-crack calculator ($S = 2^H$) evaluating candidate passwords across 4 attack scenarios:
1. Online Throttled (100 att/sec)
2. Online Unthrottled (10,000 att/sec)
3. Offline Slow Hash (10,000,000 att/sec — bcrypt/Argon2)
4. Offline Fast Hash (100,000,000,000 att/sec — MD5/SHA-256 GPU cluster)

### 7. `MOD-07`: Client-Side Hashing & KDF Lab
Interactive educational cryptographic laboratory demonstrating legacy hashes (MD5, SHA-1), modern fast hashes (SHA-256, SHA-512), and Key Derivation Functions (PBKDF2, bcrypt, Argon2id). Offloaded to a dedicated Web Worker (`kdfWorker.js`) using a WebAssembly binary (`/argon2.wasm`) to keep the UI thread 100% fluid.

### 8. `MOD-08`: Typo-Squatting Stress Test
Evaluates single-edit distance QWERTY mutations (transpositions, shift slips, neighbor key replacements) 100% in-browser against the local Bloom filter dataset.

### 9. `MOD-09`: Encrypted Vault Export & Import
Zero-knowledge backup manager utilizing Web Crypto API (`SubtleCrypto`):
- **Export**: Encrypts session credentials into an **AES-256-GCM** payload using **PBKDF2-HMAC-SHA256** (600,000 iterations) and downloads a `.cgvault` JSON package.
- **Import & Decrypt**: Features a drag-and-drop file upload zone for `.cgvault` / `.json` backup files, metadata parser (`salt`, `iv`, `iterations`), Master Passphrase prompt, client-side Web Crypto decryption, error handling, and session restoration.
- **Guidance Notice**: Includes explicit warning banner stating backup files cannot be opened in raw text editors.

### 10. `MOD-10`: Breach-Leak Exposure Timeline
Historical breach reference timeline rendering citable breach statistics (RockYou, Adobe, Yahoo, LinkedIn, Canva, LastPass) powered by a bundled offline dataset (`breach-timeline.json`).

### 11. `MOD-11`: Offline TOTP / 2FA QR Generator Sandbox
In-browser 2FA secret generator and scanner sandbox producing CSPRNG base32 secrets, scannable `otpauth://` QR codes (`qrcode.react`), and rotating 30-second 6-digit TOTP tokens (`otplib`). Operates 100% offline.

### 12. `MOD-12`: Interactive Password Audit Dashboard
In-browser batch password auditing supporting multiline paste and local `.txt`/`.csv` file import via native `FileReader` API. Features a **Duplicate Detector**, **Weak Link Alert**, and **Entropy/Score Distribution Chart** with zero data persistence.

---

## 🔒 Security & Privacy Guarantees

| Security Aspect | Implementation Detail | Guarantee |
|---|---|---|
| **Data Transmission** | 100% In-Browser Execution | **0 Network Requests** for analysis, generation, breach checks, or vault operations. |
| **Breach Checks** | Compact 150KB Local Bloom Filter ($p \le 1\%$) | Matches against top-100k common breach patterns completely offline. |
| **Vault Encryption** | AES-256-GCM + PBKDF2-HMAC-SHA256 (600,000 iterations) | Standard Web Crypto primitives (`SubtleCrypto`); keys derived strictly in browser memory. |
| **Randomness** | `window.crypto.getRandomValues()` | Cryptographically Secure Pseudorandom Number Generation (CSPRNG). |
| **WebAssembly Security** | Argon2id compiled to `/argon2.wasm` | Isolated Web Worker execution with fallback to browser Web Crypto. |
| **Data Storage** | Transient React State | Candidate inputs are never saved to `localStorage`, `sessionStorage`, or external databases. |

Full threat model and security control checklist: [`SECURITY.md`](./SECURITY.md).

---

## 🛠️ Local Development & Build Commands

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation

```bash
# Clone repository
git clone https://github.com/AshXtreme/Cipher_Guard.git
cd Cipher_Guard/frontend

# Install dependencies
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Automated Vitest Suite

```bash
npm test
```
Executes the full test suite (67 unit tests covering components, sound engines, WASM workers, and vault encryption).

### 4. Build Production Bundle

```bash
npm run build
```
Compiles production assets to `dist/`, including static WebAssembly binaries (`/argon2.wasm`).

### 5. Preview Production Build

```bash
npm run preview
```
Previews the production build at `http://localhost:4173` with full WebAssembly `application/wasm` MIME header support.

---

## 🌐 Deploying to Vercel

CipherGuard is configured for instant zero-configuration static deployment on **Vercel**:

1. **Framework Preset**: `Vite`
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### Public Asset & WASM Resolution
The build process preserves static WebAssembly binaries in `public/argon2.wasm` and sets `assetsInclude: ['**/*.wasm']` in `vite.config.js`. When deployed on Vercel, `/argon2.wasm` is served directly with `Content-Type: application/wasm`.

---

## 🧪 Quality Assurance & Test Coverage

The frontend maintains high automated test coverage via **Vitest** and `@testing-library/react`:

- `analyzer.test.jsx`: Client-side strength scoring & heuristic rule checks.
- `bloomFilter.test.jsx`: Instant 0-network Bloom filter pattern matching.
- `policyGenerator.test.jsx`: CSPRNG password policy generation & Fisher-Yates shuffle.
- `tactileAudio.test.jsx`: Web Audio API sound synthesizer & autoplay policy compliance.
- `TactileGenerator.test.jsx`: Generator UI interaction & tactile feedback.
- `vaultExporter.test.jsx`: AES-256-GCM encryption & PBKDF2 round-trip derivation.
- `VaultImport.test.jsx`: File upload, metadata parsing, passphrase prompt & vault restoration.
- `AuditDashboard.test.jsx`: Batch audit processing & distribution histogram.
- `TotpGenerator.test.jsx`: Base32 secret generation & TOTP rotation.

---

## 📄 License & Attribution

Licensed under the [MIT License](./LICENSE). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for third-party dataset and open-source library attributions.
