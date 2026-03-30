# Security Model

## Goal

Generate a random number in a public setting such that no single participant can influence the outcome, and any observer can verify correctness.

## Threat Model

- Any one (or two) of the three entropy sources may be adversarial.
- The ceremony operator controls the software but the output is auditable (unminified, single-file HTML with CSP and SRI).
- Network MITM is possible on the random.org fetch (mitigated by XOR — one honest source suffices).
- The audience may include both non-technical observers and adversarial technical observers.

## Protocol

1. **Local seed**: 32 random bytes from `crypto.getRandomValues()`. Committed via PBKDF2-HMAC-SHA-256 (random salt, 600,000 iterations). Commitment published as QR code.
2. **Remote seed**: 32 random bytes from random.org (or manual hex entry). Same commitment scheme.
3. **Human input**: A value spoken aloud. Committed via PBKDF2 with random salt (same as above). The XOR contribution is derived separately: `PBKDF2(input, SHA-256("LoTTERY" || input), 600,000)`.
4. **Reveal**: Raw seeds and human input are disclosed. All three commitments are verified against revealed values.
5. **Combine**: `combinedSeed = localSeed ⊕ remoteSeed ⊕ PBKDF2(humanInput, SHA-256("LoTTERY" || humanInput), 600000)`. The XOR inputs are the raw seeds (hidden behind commitments until reveal) and a deterministic derivation of the human input.
6. **Draw**: AES-256-CTR keystream (combined seed as key, zero IV) feeds rejection sampling over the target range.

## Key Properties

- **Commit-then-reveal**: Each source is committed before subsequent sources are collected. No participant sees another's raw input before committing their own.
- **XOR independence**: The XOR inputs (raw seeds) are hidden behind PBKDF2 commitments until all three are locked. Published commitments do not reveal the XOR inputs.
- **Uniform output**: Rejection sampling eliminates modulo bias. Discarded values are logged.
- **Deterministic replay**: Given the three inputs and parameters, anyone can reproduce the exact sequence of drawn numbers.
- **Tamper-evident log**: Every event is SHA-256 hash-chained. Modifying any entry breaks the chain.

## Assumptions

- `crypto.subtle` (Web Crypto API) is correctly implemented by the browser.
- At least one of the three entropy sources provides genuine randomness.
- PBKDF2-HMAC-SHA-256 is computationally hiding at the chosen iteration count.
- AES-256-CTR is a secure PRF.

## Supply Chain

- The only external dependency is `qrcode-generator`, embedded as a separate `<script>` with browser-enforced SRI (`integrity` attribute). Its SHA-256 can be verified against the npm package.
- All cryptographic operations use the browser's built-in Web Crypto API. No third-party crypto libraries.
- The output HTML is unminified for human auditability, with a Content-Security-Policy that pins script and style hashes.
- `SHA256SUMS` is generated at build time for signing by the ceremony organizer.

