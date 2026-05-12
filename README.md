# LoTTERY

**Low-Trust Technical Excellence Random Yield** — a publicly verifiable RNG ceremony tool for fair, tamper-resilient random draws.

> **Not a developer?** Read the [plain-language explanation](EXPLAINER.md) of what this tool does and why it matters.

## What is this?

LoTTERY conducts random draws (lotteries, selections, audits) in a way that is:

- **Provably fair** — all outcomes are equally likely, enforced by rejection sampling
- **Tamper-resilient** — three independent entropy sources are XOR-combined; compromising one (or even two) is insufficient to steer the result
- **Publicly verifiable** — QR codes displayed during the ceremony let any observer independently verify the draw after the fact
- **Replayable** — given the revealed seeds, anyone can reproduce the exact same sequence of numbers at home
- **Auditable** — the entire application is a single unminified HTML file (~155KB) that a competent developer can review in a day

## How it works

1. Three independent random sources (hardware RNG, random.org, spoken human input) each produce a secret seed
2. Each seed is cryptographically committed (PBKDF2-HMAC-SHA-256, 600k iterations) and the commitment is published as a QR code — before other seeds are known
3. After all three commitments are published, seeds are revealed and verified against commitments
4. Seeds are XOR-combined into a single key that feeds AES-256-CTR as a deterministic CSRNG
5. Numbers are drawn via rejection sampling for perfect uniformity
6. Every step is recorded in a SHA-256 hash-chained log

## Quick start

```bash
npm ci --ignore-scripts
npm test
npm run build       # → dist/index.html + dist/SHA256SUMS
npm run validate    # structural audit of the built file
```

Output is a single self-contained HTML file. Open it in any browser — no server needed.

## Verification

```bash
# Check file integrity
shasum -a 256 -c dist/SHA256SUMS

# Full structural validation (CSP, SRI, AST, npm registry check)
npm run validate
```

See [AUDIT_GUIDE.md](AUDIT_GUIDE.md) for a step-by-step audit checklist.

## Recommended ceremony setup

1. Download `index.html` and its `SHA256SUMS` (+ GPG signature when available)
2. Verify: `shasum -a 256 -c SHA256SUMS`
3. Boot [TAILS](https://tails.net) from read-only media
4. Open the file in Tor Browser
5. Conduct the ceremony with the audience

See [SECURITY.md](SECURITY.md) for the threat model and [PAPER.md](PAPER.md) for the full cryptographic construction.

## Project structure

```
src/              TypeScript source modules
  crypto.ts       Commitments, XOR, PBKDF2, SHA-256
  csrng.ts        AES-256-CTR deterministic RNG
  sampling.ts     Rejection sampling
  ceremony.ts     Ceremony state machine
  log.ts          Hash-chained event log
  ui.ts           UI logic
  i18n.ts         Localization (BG/EN)
tests/            Unit tests (Vitest)
scripts/
  validate.mjs    Build output auditor
dist/             Build output (single HTML + SHA256SUMS)
```

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [EXPLAINER.md](EXPLAINER.md) | General public | Plain-language explanation |
| [SECURITY.md](SECURITY.md) | Security-aware readers | Threat model, protocol summary |
| [PAPER.md](PAPER.md) | Cryptographers, auditors | Full construction with references |
| [AUDIT_GUIDE.md](AUDIT_GUIDE.md) | Auditors, developers | Step-by-step verification checklist |

## License

MIT
