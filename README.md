# LoTTERY

**Low-Trust Technical Excellence Random Yield** — a publicly verifiable RNG ceremony tool.

## What It Does

Generates provably fair random numbers for public drawings (lotteries, raffles, selections). Three independent entropy sources are combined so that no single participant can control the outcome. Every step is logged, committed, and verifiable.

## How It Works

1. Three entropy sources (local hardware RNG, remote atmospheric noise, spoken human input) each produce a secret value.
2. Each value is cryptographically committed (PBKDF2) and the commitment is displayed as a QR code — before other values are known.
3. After all commitments are published, the raw values are revealed and verified.
4. The values are XOR-combined into a single seed that feeds a deterministic CSRNG (AES-256-CTR).
5. Numbers are drawn using rejection sampling for perfect uniformity.

The entire ceremony log is hash-chained and exportable. Anyone can import a log and replay the ceremony to independently verify results.

## Building

```bash
npm install
npm test          # run unit tests
npm run build     # produces dist/index.html + dist/SHA256SUMS
npm run validate  # audit dist/index.html (hashes, CSP, SRI, AST)
```

The output is a single self-contained HTML file. Open it directly in a browser — no server required.

## Verifying

```bash
# Check file integrity
shasum -a 256 -c dist/SHA256SUMS

# Verify the QR library against npm
npm pack qrcode-generator@1.5.2
shasum -a 256 qrcode-generator-1.5.2.tgz
```

The HTML file is intentionally unminified so anyone can read the source. See [SECURITY.md](SECURITY.md) for the full security model.

## License

MIT
