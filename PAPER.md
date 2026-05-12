# LoTTERY: A Publicly Verifiable Random Draw Ceremony Tool

## Abstract

LoTTERY (Low-Trust Technical Excellence Random Yield) is a cryptography-based tool for conducting random draw ceremonies in public settings — such as selecting voting machines for external validation — where transparency, fairness, and post-hoc verifiability are paramount. The system combines three independent entropy sources via a commit-then-reveal protocol, feeds the result into a deterministic CSRNG, and produces a tamper-evident hash-chained log that any observer can independently replay to confirm the outcome.

This paper describes the security goals, cryptographic construction, and software security posture of LoTTERY.

---

## 1. Security Properties

### 1.1 Motivation

Public random draws — lotteries, jury selections, audit sample picks, assignment of voting machines to validation slots — demand properties that are in tension. The draw must be *unpredictable* (no party can steer the outcome), yet *fully transparent* (every observer must be able to convince themselves that the outcome was fair). Traditional approaches rely on physical artifacts (numbered balls, shuffled decks) whose fairness is hard to verify after the fact, or on trusted servers whose internal state is opaque.

LoTTERY is designed to resolve this tension through cryptographic means. Its core properties are:

**Fairness.** All outcomes within the declared range are equally likely. This is guaranteed by the combination of a cryptographically secure pseudorandom generator with rejection sampling that eliminates modulo bias.

**Tamper-resilience.** Compromising the draw requires simultaneous collusion of all three entropy sources: the local machine, the external randomness service, and the human participant. If any one of the three provides genuine, independent randomness, the combined output is uniformly random regardless of the other two.

**Public-ceremony auditability.** The tool is designed for live ceremonies projected to an audience. Cryptographic commitments are displayed as QR codes at each stage. Any observer — including journalists — can photograph these QR codes and later use them to anchor an independent verification of the ceremony log. No special access or trust relationship is required.

**Simplicity and reviewability.** The entire application is a single, unminified HTML file using only the browser's built-in Web Crypto API. The cryptographic primitives are standard and well-understood (PBKDF2, AES-CTR, SHA-256). A reviewer familiar with these primitives can perform a cursory audit of the complete source in approximately one hour; a thorough line-by-line review is feasible within a single day.

**Deterministic replay.** Given the three entropy inputs (local seed, remote seed, human input) and the draw parameters, anyone can re-execute the identical code path and reproduce the exact sequence of drawn numbers. This transforms trust from "believe the operator" into "run the code yourself."

### 1.2 Threat Model

| Threat | Mitigation |
|---|---|
| Operator pre-selects a favorable local seed | Commitment binds the local seed before the remote seed or human input is known. The operator cannot adaptively choose the local seed after seeing the other inputs. |
| Remote source (random.org) is compromised | XOR combination ensures the output is uniformly random if either of the other two sources is honest and independent. |
| Human input provider steers the result | The human input is spoken aloud *before* being entered, creating a public record. PBKDF2 commitments for the other sources are computationally infeasible to invert within the ceremony window, so the human cannot reverse-engineer seeds from published commitments. |
| Two-of-three collusion | Any two parties can potentially bias the output if the third source is trivial (e.g., all zeros). However, the commit-then-reveal ordering prevents any party from seeing another's raw input before committing their own, making coordination require pre-arrangement rather than adaptive attack. |
| All three sources collude | Outside the threat model. The ceremony's security rests on the assumption that at least one source is honest. |
| Log tampered with after ceremony | SHA-256 hash-chained log entries. QR codes displayed at key steps allow any audience member to independently anchor the chain. |
| Modified HTML file substituted before ceremony | The file is distributed with a detached GPG signature and SHA-256 checksum. The file hash is displayed at ceremony start for the audience to verify. |
| Compromised browser or OS | Recommended deployment on TAILS OS booted from read-only media with Tor Browser. Residual risk is accepted — eliminating it would require a native runtime and sacrifice the auditability property. |

### 1.3 Trust Assumptions

1. The browser's Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`) is correctly implemented.
2. At least one of the three entropy sources provides genuine, independent randomness.
3. PBKDF2-HMAC-SHA-256 with 600,000 iterations is computationally hiding for the duration of the ceremony.
4. AES-256 in CTR mode is a secure pseudorandom function.
5. Observers have the opportunity to photograph QR codes during the ceremony.

---

## 2. Cryptographic Construction

### 2.1 Commit-Then-Reveal Protocol

The ceremony follows a strict sequential commit-then-reveal protocol. Each entropy source is *committed* before the next source's value is collected, ensuring no participant can adaptively choose their input based on knowledge of another's.

**Commitment scheme.** Each seed *s* is committed using PBKDF2-HMAC-SHA-256:

```
commitment = PBKDF2-HMAC-SHA-256(s, salt, 600000)
```

where `salt` is 32 freshly generated random bytes (via `crypto.getRandomValues`). The published commitment is the tuple *(pbkdf2\_output, salt, iterations)*. PBKDF2 serves a dual purpose here: it acts as a computationally hiding commitment (the work factor makes brute-force preimage search infeasible during the ceremony window), and it uses only primitives already available in every browser's Web Crypto API, avoiding any third-party cryptographic dependency.

The choice of PBKDF2 rather than a hash-based commitment (e.g., `SHA-256(s || r)`) is deliberate: the 600,000-iteration work factor provides meaningful protection even if the committed value has limited entropy, as is the case for the human input. Standard references: RFC 8018 §5.2 [1] specifies PBKDF2; NIST SP 800-132 [2] provides guidance on iteration counts for key derivation.

**Ordering.** The protocol enforces:

1. Local seed generated and committed.
2. Remote seed fetched (or manually entered) and committed.
3. Human input spoken aloud, then entered and committed.
4. All three raw values revealed.
5. All three commitments verified against revealed values.

Steps 1–3 each produce a QR code containing the commitment, visible to the audience and available for photography. No raw seed value is disclosed before step 4. This ordering guarantees that no participant sees another's raw XOR input before all three are locked.

### 2.2 Entropy Sources

**Local seed.** 32 bytes (256 bits) from `crypto.getRandomValues()`, which draws from the operating system's CSPRNG. On the recommended TAILS deployment, this is Linux's `/dev/urandom` via the kernel's CSPRNG.

**Remote seed.** 32 bytes from random.org's atmospheric noise service (legacy HTTP API: `GET /cgi-bin/randbyte?nbytes=32&format=h`). If random.org is unreachable, the operator may enter 32 bytes manually — for example, from public dice rolls captured on video. The same commitment procedure applies regardless of source.

**Human input.** An arbitrary string spoken aloud by a designated person before being typed into the application. The public announcement creates a social commitment that is independent of the cryptographic commitment. Because human input may have low entropy (a short phrase, a number), the raw string is not used directly as an XOR operand. Instead, it undergoes a deterministic key-stretching derivation (§2.3).

### 2.3 Entropy Combination

The three sources are combined into a single 32-byte seed via bitwise XOR:

```
combinedSeed = localSeed ⊕ remoteSeed ⊕ H(humanInput)
```

where:

```
H(humanInput) = PBKDF2-HMAC-SHA-256(
    humanInput,
    SHA-256("LoTTERY" || humanInput),
    600000
)
```

The XOR operands for the local and remote sources are their *raw* 32-byte seeds — the same values that were hidden behind PBKDF2 commitments until the reveal phase. The human input's XOR operand is a deterministic, domain-separated PBKDF2 derivation that stretches the potentially low-entropy input into 32 pseudorandom bytes.

**Why XOR?** The XOR combination is information-theoretically motivated. If any one of the three inputs is uniformly random over {0, 1}^256 and independent of the other two, then the XOR output is uniformly random regardless of the distribution of the remaining inputs. This is a direct consequence of the XOR lemma for independent random variables [3]. In the LoTTERY context, the "independence" condition is enforced by the commit-then-reveal ordering: no participant can choose their input as a function of another's, because the other's raw value is hidden behind a computationally hiding commitment.

**Separation of commitments and XOR inputs.** The PBKDF2 commitments published as QR codes during steps 1–3 are *not* the XOR inputs. The commitment scheme uses a fresh random salt per commitment, making the PBKDF2 output an effectively random value that reveals nothing about the underlying seed. The XOR inputs (raw local seed, raw remote seed, derived human contribution) remain secret until the reveal phase. This separation is critical: if the published commitments were the XOR inputs, an adversary controlling the last source could compute the XOR of the first two commitments and choose their input to target a specific combined seed.

**Domain separation for human input.** The salt for the human input's XOR derivation is `SHA-256("LoTTERY" || humanInput)` — deterministic and input-dependent. This achieves two goals: (1) the derivation is reproducible for replay verification, and (2) the domain prefix "LoTTERY" prevents cross-protocol attacks where a PBKDF2 output computed for a different application could be substituted.

### 2.4 Deterministic CSRNG

Once the combined seed is established, all subsequent random draws are produced by a deterministic CSRNG implemented as AES-256-CTR keystream generation:

- **Key:** The 32-byte combined seed.
- **IV:** 16 zero bytes (the initial counter value).
- **Plaintext:** All zero bytes.
- **Output:** The ciphertext, which equals the AES-CTR keystream.

The CSRNG consumes keystream sequentially. Each draw reads *k* bytes (see §2.5), and the internal counter advances accordingly. No new entropy is introduced after initialization — draws 2 through *N* are deterministic consequences of the combined seed established in step 5.

This construction's security reduces directly to the security of AES-256 in CTR mode. AES-CTR is a NIST-approved mode of operation (SP 800-38A §6.5 [4]) and, under the standard assumption that AES is a secure pseudorandom permutation, produces output indistinguishable from random up to 2^64 blocks (the birthday bound on 128-bit blocks). For the expected draw volumes of a ceremony (tens to hundreds of numbers), this margin is more than sufficient.

The implementation uses the Web Crypto API's `crypto.subtle.encrypt` with the `AES-CTR` algorithm, delegating the core AES computation to the browser's native (typically hardware-accelerated) implementation rather than a JavaScript reimplementation.

### 2.5 Rejection Sampling

To map CSRNG output to a uniform integer in [min, max], LoTTERY uses rejection sampling (Knuth [5], §3.4.2):

1. Compute *rangeSize* = max − min + 1.
2. Compute *k* = the minimum number of bytes such that 256^*k* ≥ *rangeSize*, with *k* ≤ 4 (maximum supported range: 2^32).
3. Let *outputSpace* = 256^*k*.
4. Let *threshold* = *outputSpace* − (*outputSpace* mod *rangeSize*), the largest multiple of *rangeSize* that fits in *outputSpace*.
5. Read *k* bytes from the CSRNG, interpret as a big-endian unsigned integer *v*.
6. If *v* ≥ *threshold*, discard *v* (it falls in the biased remainder zone) and repeat from step 5.
7. Otherwise, return *v* mod *rangeSize* + min.

This guarantees perfectly uniform output. The probability of rejection per attempt is (*outputSpace* mod *rangeSize*) / *outputSpace*, which is always less than 1/*rangeSize* and typically negligible. The expected number of attempts is *outputSpace* / *threshold*, bounded above by 256 / 255 ≈ 1.004 in the worst case for a single byte.

Every rejected value is recorded in the ceremony log with an explanation, making the rejection process auditable and reproducible.

For draws without replacement, duplicate values are also rejected: if the drawn number has already appeared in the current ceremony, it is discarded and a new draw is performed. Duplicate rejections are logged separately from range rejections.

### 2.6 Hash-Chained Ceremony Log

Every ceremony event (seed committed, parameters locked, seed revealed, commitment verified, number generated, value rejected) is recorded in an append-only log. Each entry contains:

| Field | Description |
|---|---|
| `sequence` | Monotonically increasing integer (0-indexed) |
| `timestamp` | ISO 8601 timestamp from the browser clock |
| `event_type` | Structured event identifier |
| `payload` | Event-specific data |
| `chain_hash` | SHA-256 hash linking to the previous entry |

The chain hash is computed as:

```
chain_hash_i = SHA-256(chain_hash_{i-1} || SHA-256(canonical(entry_i)))
```

where `canonical(entry)` is the UTF-8 encoding of `JSON.stringify({sequence, timestamp, event_type, payload})` — a deterministic serialization with fixed key ordering. The genesis hash (chain\_hash\_−1) is 32 zero bytes.

This is a standard hash-chain construction (a degenerate Merkle chain). Modifying any entry invalidates its chain hash and all subsequent hashes. An observer who photographed a QR code containing a mid-ceremony chain hash can verify that the log has not been retroactively altered from that point forward.

The double-hash structure (`SHA-256(prev || SHA-256(entry))`) follows the Merkle–Damgård strengthening pattern: hashing the entry separately before concatenation prevents length-extension ambiguities in the concatenation of variable-length entries with fixed-length hashes.

---

## 3. Software Security and Deployment

### 3.1 Single-File, Unminified HTML

The build process (Vite with `vite-plugin-singlefile`) compiles the TypeScript source modules into a single self-contained HTML file with all JavaScript and CSS inlined. The output is intentionally *unminified* — variable names, function names, class structure, and comments are preserved. This is a deliberate trade-off: a minified file would be smaller but would require decompilation to audit, defeating the tool's transparency goal.

The resulting file can be opened directly from the filesystem (`file://` protocol) in any modern browser. No web server is required.

### 3.2 Content Security Policy

A `<meta http-equiv="Content-Security-Policy">` tag is injected at build time with the following directives:

| Directive | Value | Purpose |
|---|---|---|
| `default-src` | `'none'` | Deny all resource loading by default |
| `script-src` | `'sha256-...'` (one hash per inline script) | Allow only scripts whose SHA-256 matches a pinned hash |
| `style-src` | `'sha256-...'` (one hash per inline style) | Allow only styles whose SHA-256 matches a pinned hash |
| `img-src` | `data: blob:` | Allow QR code images (rendered as data URIs) |
| `connect-src` | `https://www.random.org` | Allow fetch to random.org only |
| `form-action` | `'none'` | Prevent form submissions |
| `base-uri` | `'none'` | Prevent `<base>` tag injection |

The CSP hashes are computed over the *exact byte content* of each inline `<script>` and `<style>` block. Any modification to the script or style content — even a single byte — will cause the browser to refuse execution. This provides a browser-enforced integrity guarantee that complements the file-level SHA-256 checksum.

A `<meta name="referrer" content="no-referrer">` tag prevents the browser from leaking the ceremony page URL in the `Referer` header of the random.org fetch.

### 3.3 External Dependencies

The only runtime dependency is `qrcode-generator` (by Kazuhiko Arase, MIT license), used to render commitment QR codes. It is handled as follows:

- **Build time:** The library source (`qrcode.js`) is read from the npm package in `node_modules/` and injected as a separate `<script>` tag in the output HTML.
- **Integrity:** The `<script>` tag carries an `integrity="sha256-..."` attribute containing the Base64-encoded SHA-256 hash of the library source. The browser enforces this hash at parse time via Subresource Integrity (SRI, W3C Recommendation [6]).
- **Provenance comment:** A comment above the script tag records the library name, version, author, source URLs, and the SHA-256 hash, enabling manual verification against the npm registry.
- **No CDN at runtime:** The library is fully inlined. There are no runtime `<script src="...">` references to external origins.

All cryptographic operations (PBKDF2, SHA-256, AES-CTR, `getRandomValues`) use the browser's built-in Web Crypto API. No third-party cryptographic libraries are used.

The only runtime network request is a single HTTPS fetch to `https://www.random.org/cgi-bin/randbyte?nbytes=32&format=h` to retrieve the remote seed. The CSP `connect-src` directive restricts fetch targets to this single origin.

### 3.4 Build Validation

The `npm run validate` command runs an automated audit of the built HTML file (`scripts/validate.mjs`). It performs the following checks:

1. **CSP cross-verification.** Parses the CSP meta tag, extracts all `sha256-` hashes from `script-src` and `style-src`, computes the SHA-256 of every inline `<script>` and `<style>` block, and verifies a 1:1 correspondence. Flags orphaned hashes (in CSP but not in HTML) and uncovered blocks (in HTML but not in CSP).
2. **SRI verification.** Locates the QR library `<script>` by its `integrity` attribute, recomputes the SHA-256 of the script content, and verifies it matches the declared integrity hash.
3. **npm registry verification.** Downloads the `qrcode-generator` tarball from the npm registry, extracts `qrcode.js`, computes its SHA-256, and verifies it matches both the `integrity` attribute and the embedded script content. This confirms the inlined library is byte-identical to the published npm package.
4. **URL inventory.** Extracts all URLs from JavaScript source via regex and lists them, allowing a reviewer to confirm that no unexpected network endpoints are contacted.
5. **AST structural analysis.** Parses the application module with acorn and reports top-level classes, functions, variables, and `crypto.subtle.*` call sites. This provides a high-level structural map for auditors.
6. **External resource check.** Scans all HTML `src` and `href` attributes for external URLs, flagging any unexpected external references.

### 3.5 Recommended Deployment Environment

For maximum security, the ceremony should be conducted on:

- **TAILS OS** booted from read-only media (USB stick or DVD). TAILS routes all traffic through Tor, leaves no persistent state, and provides a hardened environment.
- **Tor Browser** (bundled with TAILS). Tor Browser treats `file://` origins as secure contexts, enabling the Web Crypto API. JIT is disabled by default, which is a security benefit (no JIT-spray attacks) at the cost of slower PBKDF2 computation (the Web Crypto API delegates to native code, so the impact is limited to JavaScript overhead).
- **File verification** before ceremony: the HTML file should be verified against `SHA256SUMS` and optionally against a detached GPG signature. The file's SHA-256 hash should be displayed at ceremony start for the audience to record.

### 3.6 Supply Chain Security

- **SHA-pinned GitHub Actions.** The CI/CD pipeline (`.github/workflows/pages.yml`) pins all GitHub Actions to specific commit SHAs rather than mutable version tags, preventing a compromised action repository from injecting malicious code:

  ```
  actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
  actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f
  ```

- **`npm ci --ignore-scripts`.** The build uses `npm ci` (deterministic install from lockfile) with `--ignore-scripts` to prevent npm lifecycle scripts from executing during dependency installation. This blocks the most common npm supply-chain attack vector (malicious `postinstall` scripts).
- **SHA256SUMS.** The build process generates a `SHA256SUMS` file covering all build artifacts, suitable for signing by the ceremony organizer with a GPG key whose fingerprint is published through independent channels.
- **Minimal dependency surface.** The project has six `devDependencies` (TypeScript, Vite, vitest, vite-plugin-singlefile, qrcode-generator, and validation tools). None are runtime dependencies — the output HTML has zero external runtime dependencies beyond the single random.org API call.

---

## 4. Comparison with Alternative Approaches

| Approach | Transparency | Replay | Tamper Evidence | Auditability |
|---|---|---|---|---|
| Physical lottery (balls, dice) | High (visible) | None | None (no log) | Requires video |
| Trusted server RNG | None (opaque) | Only if server cooperates | Server-controlled logs | Requires trust |
| Blockchain VRF (e.g., Chainlink) | On-chain | On-chain | On-chain | Requires blockchain literacy |
| **LoTTERY** | High (QR codes, live display) | Full (deterministic) | Hash-chained log | Single HTML file, standard crypto |

LoTTERY occupies a pragmatic middle ground: it provides the verifiability of blockchain-based schemes without requiring blockchain infrastructure or literacy, while offering the transparency of physical methods with the addition of cryptographic tamper evidence and deterministic replay.

---

## 5. Limitations

- **Two-of-three collusion.** If two of the three entropy sources collude and pre-arrange their inputs, they can determine the combined seed (they know their own inputs and can compute the third's contribution after the ceremony). The commit-then-reveal protocol prevents *adaptive* collusion but not *pre-arranged* collusion.
- **Browser trust.** The security model trusts the browser's Web Crypto API implementation. A compromised browser could subvert `crypto.getRandomValues` or `crypto.subtle`. The TAILS recommendation mitigates this but does not eliminate it.
- **Timestamp accuracy.** Log timestamps come from the browser's clock, which the operator controls. Timestamps provide ordering evidence but are not cryptographically guaranteed. The hash chain provides ordering integrity independent of timestamps.
- **Maximum range.** The rejection sampling implementation supports ranges up to 2^32 values. This is sufficient for all practical ceremony use cases but is not a fundamental limitation of the construction.

---

## References

[1] K. Moriarty, B. Kaliski, and A. Rusch, "PKCS #5: Password-Based Cryptography Specification Version 2.1," RFC 8018, January 2017.

[2] NIST, "Recommendation for Password-Based Key Derivation, Part 1: Storage Applications," SP 800-132, December 2010.

[3] The XOR lemma: if X is uniformly distributed over {0,1}^n and Y is any random variable over {0,1}^n independent of X, then X ⊕ Y is uniformly distributed over {0,1}^n. See, e.g., Shaltiel, R., "An Introduction to Randomness Extractors," ICALP 2011, or any standard treatment of pairwise independence.

[4] NIST, "Recommendation for Block Cipher Modes of Operation: Methods and Techniques," SP 800-38A, December 2001.

[5] D. E. Knuth, *The Art of Computer Programming, Volume 2: Seminumerical Algorithms*, 3rd edition, Addison-Wesley, 1997. §3.4.2 (rejection method for random sampling).

[6] W3C, "Subresource Integrity," W3C Recommendation, 23 June 2016.
