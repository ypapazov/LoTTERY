# Security Model

## Goal

Generate random numbers in a public setting such that no single participant can influence the outcome, and any observer can verify correctness after the fact.

## Fundamental Trust Assumption

**The security of LoTTERY depends on the ceremony being public.** If run privately, the operator can trivially regenerate seeds until a desired outcome is reached. The audience — journalists, observers, anyone with a camera — IS the security mechanism. The tool provides the cryptographic infrastructure that makes public verification possible; the public setting provides the social enforcement.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Operator pre-selects a favorable outcome | Commit-then-reveal protocol binds each seed before subsequent seeds are collected. XOR combination means the operator controls at most one source. |
| Human input provider steers the result | PBKDF2 commitments are computationally infeasible to brute-force within the ceremony window. The human cannot reverse-engineer other seeds from their commitments. |
| random.org is malicious or compromised | XOR guarantees the output is uniformly random if either of the other two sources is honest. |
| Compromised browser or OS | TAILS boots from read-only media with Tor Browser. Residual risk accepted — mitigating further would require a native runtime and sacrifice auditability. |
| Log tampered with after ceremony | Hash-chained log entries. QR codes displayed at key steps let any audience member anchor the chain independently. |
| Modified HTML file substituted | File hash published in SHA256SUMS, verified before ceremony. File is unminified for visual inspection. |
| Statistical bias in range mapping | Rejection sampling eliminates modulo bias. Every discarded value is logged. |
| Operator changes parameters after seeing seeds | Parameters are logged with timestamps. In a public ceremony, any console manipulation is visible to the audience. |

## Protocol Summary

1. **Local seed**: 32 random bytes from `crypto.getRandomValues()`. Committed via PBKDF2-HMAC-SHA-256 (random salt, 600,000 iterations). Commitment displayed as QR code.
2. **Remote seed**: 32 random bytes from random.org (or manual hex entry). Same commitment scheme.
3. **Human input**: A value spoken aloud by a participant. Committed via PBKDF2 with a random salt.
4. **Reveal**: Raw seeds and human input are disclosed. All commitments are verified.
5. **Combine**: `combinedSeed = localSeed ⊕ remoteSeed ⊕ PBKDF2(humanInput, SHA-256("LoTTERY" || humanInput), 600000)`.
6. **Draw**: AES-256-CTR keystream (combined seed as key, zero IV) feeds rejection sampling over the target range.

## Key Properties

- **Commit-then-reveal**: Each source is committed before subsequent sources are collected.
- **XOR independence**: If at least one of the three XOR inputs is uniformly random and independent, the output is uniformly random regardless of the other two.
- **Uniform output**: Rejection sampling eliminates modulo bias.
- **Deterministic replay**: Given the three inputs and parameters, anyone can reproduce the exact sequence.
- **Tamper-evident log**: SHA-256 hash-chained. Modifying any entry breaks the chain.

## Cryptographic Assumptions

- `crypto.subtle` (Web Crypto API) is correctly implemented by the browser.
- At least one of the three entropy sources provides genuine randomness.
- PBKDF2-HMAC-SHA-256 is computationally hiding at 600,000 iterations.
- AES-256-CTR is a secure PRF (NIST SP 800-38A).

## Supply Chain

- Only external dependency: `qrcode-generator`, embedded with browser-enforced SRI.
- All cryptography uses the browser's built-in Web Crypto API. No third-party crypto libraries.
- Output HTML is unminified for auditability.
- Content-Security-Policy pins SHA-256 hashes of all inline scripts and styles.
- Build validation (`npm run validate`) checks CSP, SRI, script inventory, AST structure, and verifies the QR library against the npm registry.

## Deployment

The recommended deployment for a high-stakes ceremony:

1. Boot [TAILS](https://tails.net) from read-only media (USB or DVD)
2. TAILS supports UEFI Secure Boot since v4.5, but recent machines with SBAT level 5 may require disabling Secure Boot (see [known issue](https://gitlab.tails.boum.org/tails/tails/-/work_items/20471))
3. Open the verified HTML file in Tor Browser
4. The only network request is to random.org for the remote seed; after that, the tool works offline

For machines where Secure Boot conflicts with TAILS:
- Temporarily disable Secure Boot in BIOS/UEFI settings
- Document this step publicly as part of the ceremony preparation
- Re-enable after the ceremony
- The file hash verification (SHA256SUMS) provides integrity assurance independent of the boot chain

## Reporting Security Issues

If you find a security vulnerability, please report it via GitHub Security Advisories on this repository, or contact the maintainer directly.
