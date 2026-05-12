# Audit Guide

How to verify the LoTTERY ceremony tool — a single-file HTML application (~155 KB) for publicly verifiable RNG ceremonies. The source is intentionally unminified, uses the Web Crypto API for all cryptography, and has one external dependency (`qrcode-generator`) embedded with Subresource Integrity.

---

## Quick Audit (1 hour)

### 1. File integrity

```sh
shasum -a 256 dist/index.html
```

Compare the output to `dist/SHA256SUMS`. If the ceremony organizer published a signed hash, compare against that.

### 2. Run the automated validator

```sh
npm run validate
```

This runs `scripts/validate.mjs`, which:
- Parses the HTML and extracts every `<script>` and `<style>` block
- Computes SHA-256 of each block and cross-checks against the CSP `<meta>` tag
- Verifies the QR library's `integrity` attribute matches its content
- Downloads `qrcode-generator` from the npm registry, extracts `qrcode.js` from the tarball, and compares its hash to the embedded copy
- Inventories every URL referenced in JavaScript
- Parses the application module with acorn and lists top-level declarations and `crypto.subtle.*` call sites
- Checks for external resource references in HTML attributes

Any mismatch prints a red ✗ and exits non-zero.

### 3. Inspect the CSP meta tag

Open `dist/index.html` and find the `<meta http-equiv="Content-Security-Policy">` tag in the `<head>`. It should contain:

| Directive | Expected value |
|---|---|
| `default-src` | `'none'` |
| `script-src` | Two `sha256-…` hashes (QR library + app module) |
| `style-src` | One `sha256-…` hash |
| `img-src` | `data: blob:` |
| `connect-src` | `https://www.random.org` |
| `form-action` | `'none'` |
| `base-uri` | `'none'` |

There should be exactly two `<script>` tags (one with an `integrity` attribute for the QR library, one `type="module"` for the app) and one `<style>` tag.

### 4. Grep for network calls

```sh
grep -n 'fetch(' dist/index.html
```

Every `fetch(` call should reference `https://www.random.org/cgi-bin/randbyte` (the entropy endpoint) or be a `blob:` URL (for file export). Nothing else.

### 5. Verify the QR library independently

```sh
npm pack qrcode-generator@1.4.4
tar xzf qrcode-generator-1.4.4.tgz
shasum -a 256 package/qrcode.js
```

Compare to the `integrity` attribute on the first `<script>` tag in `dist/index.html`. The SHA-256 (hex) is also printed in the HTML comment above that script.

### 6. Run a test ceremony and replay it

1. Open `dist/index.html` in a browser
2. Complete a ceremony: generate local seed → fetch/enter remote seed → enter human input → reveal → verify → draw numbers
3. Export the ceremony log (JSON)
4. Use the app's replay mode with the same inputs — the drawn numbers and all intermediate values must match exactly

---

## Deep Audit (1 day)

### 1. Read the source

The `src/` directory contains ~1,900 lines of TypeScript across 10 files. The core logic (excluding UI) is ~800 lines in six files:

| File | Purpose |
|---|---|
| `crypto.ts` | PBKDF2 commitments, XOR, constant-time comparison, human-input derivation |
| `csrng.ts` | Deterministic AES-256-CTR keystream generator |
| `sampling.ts` | Rejection sampling with configurable byte width |
| `ceremony.ts` | State machine (INIT → DRAWING), replay function |
| `log.ts` | SHA-256 hash-chained event log |
| `random-org.ts` | Fetch 32 bytes from random.org (or accept manual hex entry) |

### 2. Trace the data flow

```
Seed generation
  crypto.getRandomValues(32)  →  localSeed
  random.org / manual entry   →  remoteSeed
  spoken human input          →  humanInput

Commitment (before any reveal)
  For each seed:
    salt = crypto.getRandomValues(32)
    commitment = PBKDF2-HMAC-SHA-256(seed, salt, 600,000)
  For human input:
    commitment uses the raw text as input, random salt

Reveal
  Raw seeds + human input disclosed; commitments verified

Combine
  humanContribution = PBKDF2(humanInput, SHA-256("LoTTERY" || humanInput), 600,000)
  combinedSeed = localSeed ⊕ remoteSeed ⊕ humanContribution

Draw
  AES-256-CTR key = combinedSeed (32 bytes)
  IV = block counter starting at 0 (big-endian in bytes 8–15)
  Plaintext = all zeros → ciphertext IS the keystream
  For each number:
    k = minimum bytes such that 256^k >= rangeSize
    threshold = 256^k - (256^k mod rangeSize)
    Read k bytes, interpret as big-endian integer
    If value >= threshold → reject (log it), retry
    Result = value mod rangeSize + min
```

### 3. Verify the cryptographic construction

Compare the code in `src/crypto.ts` and `src/ceremony.ts` against `SECURITY.md`:

- **Commit-then-reveal ordering**: `generateLocalSeed()` must complete before `setRemoteSeed()`, which must complete before `receiveHumanInput()`. The `assertStep()` guard enforces this.
- **XOR independence**: The XOR operands are raw seeds (hidden behind PBKDF2 commitments until `revealSeeds()`). The human input's XOR contribution uses a separate deterministic derivation: `PBKDF2(input, SHA-256("LoTTERY" || input), 600000)`.
- **Rejection sampling**: `sampling.ts` computes `threshold = outputSpace - (outputSpace % rangeSize)`. Values ≥ threshold are rejected. This eliminates modulo bias.
- **Deterministic replay**: Given the three inputs plus commitment salts/iterations, `replayCeremony()` reconstructs the exact same draws.

### 4. Check for side channels

- **Constant-time comparison** (`crypto.ts:59–66`): `constantTimeEqual` accumulates XOR differences with `|=` and only branches on the final `diff === 0`. Verify there is no early return on mismatch.
- **No branching on secret data**: The rejection sampling loop's branch condition (`value >= threshold`) operates on PRNG output, not secret keys. The CSRNG key material never appears in control flow after `importKey`.
- **Key material lifecycle**: `CSRNG.create()` calls `importKey` with `extractable: false`. The raw seed is not retained after import.

### 5. Review the build pipeline

`vite.config.ts` defines three build stages:

1. **Externalize QR library**: `import 'qrcode-generator'` resolves to `window.qrcode` in the build, so the library is not bundled into the app module.
2. **Single-file assembly** (`vite-plugin-singlefile`): All assets are inlined into one HTML file.
3. **Post-build plugin** (`closeBundle`):
   - Injects `qrcode-generator/qrcode.js` as a separate `<script>` with an `integrity="sha256-…"` attribute computed from the npm package contents.
   - Walks the HTML to find all `<script>` and `<style>` blocks, computes their SHA-256, and injects a CSP `<meta>` tag with those hashes.
   - Generates `dist/SHA256SUMS`.

The build uses `minify: false` and `cssMinify: false` to preserve readability.

### 6. Run the test suite

```sh
npm test
```

65 tests across 5 files:

| File | Count | Coverage |
|---|---|---|
| `crypto.test.ts` | 21 | PBKDF2, commitments, XOR, hex encoding, human derivation |
| `ceremony.test.ts` | 14 | State machine transitions, replay, parameter locking |
| `sampling.test.ts` | 13 | Rejection sampling, chunk sizing, uniformity, edge cases |
| `log.test.ts` | 11 | Hash chain integrity, serialization, tamper detection |
| `csrng.test.ts` | 6 | Determinism, block boundary crossing, seed validation |

### 7. Reproducible build

```sh
git clone <repo-url> lottery-audit && cd lottery-audit
npm ci --ignore-scripts
npm run build
shasum -a 256 dist/index.html
```

Compare the hash to `dist/SHA256SUMS` from the published release. If they match, the binary was built from the published source without modification.

Note: the build is deterministic only when using the same Node.js version and platform, since `vite-plugin-singlefile` output and CSP hash computation depend on exact whitespace.

---

## What to Look For (Red Flags)

- **Unmatched CSP hash**: Any `<script>` or `<style>` tag whose SHA-256 is not in the CSP `script-src` or `style-src` directive.
- **Unexpected network calls**: Any `fetch()` targeting a URL other than `https://www.random.org/cgi-bin/randbyte`. Any `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, or `<img src="http…">`.
- **Dynamic code execution**: Any use of `eval()`, `Function()`, `setTimeout(string)`, `import()` with a variable argument, or `document.createElement('script')`.
- **Non-WebCrypto cryptography**: Any crypto operation that does not go through `crypto.subtle` or `crypto.getRandomValues`. Custom AES, SHA, or PRNG implementations.
- **Minified or obfuscated code**: The entire file should be human-readable. Any section that appears compressed, base64-encoded, or name-mangled (beyond Vite's standard module wrapper).
- **Missing rejection sampling**: If values are drawn with `% rangeSize` without a threshold check, the output has modulo bias.
- **Early return in constant-time comparison**: The `constantTimeEqual` function must not short-circuit on the first differing byte.
- **Extractable key material**: `importKey` must be called with `extractable: false` for the AES key.

---

## Verification Tools

| Tool | Command | What it does |
|---|---|---|
| Automated validator | `npm run validate` | Structural analysis: CSP, SRI, script count, AST, npm registry match |
| File checksum | `shasum -a 256 dist/index.html` | Compare against `dist/SHA256SUMS` or organizer's published hash |
| Test suite | `npm test` | 65 tests covering crypto primitives, ceremony state machine, sampling |
| Replay mode | Built into the app UI | Re-run a ceremony from exported log; outputs must match exactly |
