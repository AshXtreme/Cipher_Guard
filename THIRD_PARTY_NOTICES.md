# Third-Party Notices & Attribution

CipherGuard includes third-party open-source software and public datasets. This document details the notices, licenses, and attributions required by those projects.

---

## 1. SecLists Common Passwords Dataset

- **Project**: [SecLists](https://github.com/danielmiessler/SecLists) (Common-Credentials)
- **Author**: Daniel Miessler
- **License**: MIT License
- **Usage**: Used to construct the build-time static Bloom filter asset (`data/top_100k_passwords.txt` / `frontend/src/assets/bloomFilterData.json`).

```text
The MIT License (MIT)

Copyright (c) 2014 Daniel Miessler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. EFF Large Wordlist

- **Project**: Electronic Frontier Foundation (EFF) Diceware Wordlists
- **Author**: Electronic Frontier Foundation
- **License**: Creative Commons Zero (CC0) / Public Domain
- **Usage**: Bundled locally in `data/eff_large_wordlist.txt` for the Diceware Passphrase Generator mode.

---

## 3. Open Source Software Dependencies

CipherGuard is built using open-source software libraries licensed under permissive licenses:

| Package | Purpose | License |
|---|---|---|
| **FastAPI** | Async Python web framework | MIT |
| **Uvicorn** | ASGI web server | BSD-3-Clause |
| **Pydantic** | Data validation | MIT |
| **slowapi** | Rate limiting middleware | MIT |
| **React & React-DOM** | Frontend UI framework | MIT |
| **Vite** | Frontend build tool | MIT |
| **HeroUI** | React component system | MIT |
| **Tailwind CSS** | Utility-first CSS framework | MIT |
| **Lucide React** | Monospaced industrial icon set | ISC |
| **Pytest** | Backend automated test suite | MIT |
| **Vitest** | Frontend automated test suite | MIT |
