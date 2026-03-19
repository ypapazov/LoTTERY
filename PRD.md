# Low-Trust Technical Excellence Random Yield (LoTTERY): A Public Verifiable RNG Ceremony Tool 
Product Requirements Document

## 1. Overview

A single-file, zero-dependency HTML application for conducting publicly verifiable random number generation ceremonies. Designed for use cases where fairness must be provable — lotteries, drawings, public selections — and where no single party should be able to influence or predict the outcome.

The tool combines three independent entropy sources via XOR, uses a commit-then-reveal protocol to bind participants before results are known, and produces a tamper-evident log that any observer can independently verify after the ceremony.

## 2. Goals

- **Unpredictable**: No party — operator, audience member, or external service — can predict or steer the output, even if two of three entropy sources are compromised.
- **Verifiable**: Any observer can replay the ceremony from the committed seeds and confirm the output.
- **Auditable**: A hash-chained log with QR checkpoints allows post-ceremony tamper detection by anyone who photographed a QR code during the event.
- **Self-contained**: A single HTML file with no external runtime dependencies beyond one API call to random.org. Runs offline after that fetch.
- **Accessible**: Non-technical observers should understand what is happening and why, through clear visual indicators and contextual explanations.

## 3. Non-Goals

- Real-time multi-party interactive participation (observers verify, they don't participate beyond the human input role).
- Persistent state across ceremonies (each ceremony is independent).
- Mobile-native UX (designed for a laptop projected to an audience).

## 4. Threat Model

| Threat | Mitigation |
|---|---|
| Operator pre-selects a favorable outcome | Commitment scheme binds JS and random.org seeds before human input is received. XOR combination means operator controls at most one source. |
| Human input provider steers the result | PBKDF commitments are computationally infeasible to brute-force within the ceremony window. Human cannot reverse-engineer other seeds from commitments. |
| random.org is malicious or compromised | XOR combination guarantees output is uniformly random if either of the other two sources is honest. |
| Compromised browser or OS | Tails boots from read-only media with a hardened Tor Browser. Residual risk accepted — mitigating further would require a native runtime and sacrifice auditability. |
| Log tampered with after ceremony | Hash-chained log entries. QR codes displayed at key steps allow any audience member to anchor the chain independently. |
| Modified HTML file substituted before ceremony | File distributed with a detached GPG signature. File hash displayed at ceremony start. |
| Statistical bias in range mapping | Rejection sampling eliminates modulo bias. Dropped values are logged and explained. |

## 5. Ceremony Protocol

### 5.1 Pre-Ceremony

1. Download the HTML file and its detached GPG signature from the official distribution site.
2. Verify the signature against the published signing key fingerprint.
3. Record the SHA-256 hash of the HTML file.
4. Boot the ceremony machine into Tails from read-only media.
5. Open the HTML file in Tor Browser.

### 5.2 Ceremony Execution

The following steps are enforced by the application in this order:

**Step 1 — Generate local seed**
The application generates a cryptographically random seed using the Web Crypto API (`crypto.getRandomValues()`). The PBKDF2 hash of this seed is computed with a random salt. The commitment (PBKDF2 output + salt + iteration count) is displayed and rendered as a QR code. The seed itself is not yet revealed.

**Step 2 — Fetch remote seed**
The application requests a random value from random.org. On receipt, the PBKDF2 commitment (output + salt + iteration count) is displayed and rendered as a QR code. The seed itself is not yet revealed.

**Step 3 — Lock parameters**
The operator publicly sets the minimum and maximum values for the output range. These are displayed on screen and visible to the audience. This step is a UX operation, not a security operation — the committed seeds are opaque and cannot be exploited with knowledge of the range.

**Step 4 — Receive human input**
A designated person provides a random number. This must be spoken aloud or otherwise made publicly visible before being entered into the application. The value is processed with PBKDF2-HMAC-SHA-256 (with a freshly generated random salt) to produce a fixed-length, computationally hardened input. The PBKDF2 output, salt, and iteration count are displayed and logged.

**Step 5 — Reveal and verify commitments**
The JS seed and random.org seed are revealed. The application recomputes their PBKDF2 outputs and displays verification status against the earlier commitments.

**Step 6 — Generate output**
The three PBKDF2 outputs (JS seed commitment, random.org seed commitment, human input commitment) are XOR'd to produce a combined seed. This seeds a CSRNG. The first output of the CSRNG is mapped to the [min, max] range using rejection sampling. The result is displayed.

**Step 7 — Subsequent draws (if needed)**
Each additional number is the next sequential output of the CSRNG seeded in Step 6. No new entropy is introduced. The log makes explicit that numbers 2 through N are deterministic consequences of the original three seeds.

### 5.3 Post-Ceremony

1. Export the full log.
2. Any observer can verify the log's hash chain against QR codes they photographed.
3. Any observer can replay the ceremony using the replay mode with the revealed seeds.

## 6. Cryptographic Specifications

### 6.1 Commitment Scheme

- **Algorithm**: PBKDF2-HMAC-SHA-256
- **Salt**: Cryptographically random, generated per commitment, committed alongside the hash output
- **Iterations**: Fixed value, displayed in commitment (recommend ≥ 600,000)
- **Purpose**: Prevents brute-force recovery of low-entropy or bounded seeds from the commitment during the ceremony window
- **Commitment payload**: `{pbkdf2_output, salt, iteration_count}`

### 6.2 Entropy Combination

- **Method**: Bitwise XOR of all three PBKDF2 commitment outputs
- **Property**: Output is uniformly random if any one of the three inputs is uniformly random and independent of the others
- **Input normalization**: All three sources are processed through PBKDF2-HMAC-SHA-256 (per §6.1), producing 32-byte outputs. These PBKDF2 outputs — not the raw seeds — are the values XOR'd together. Simple SHA-256 is not used for normalization due to the predictability of low-entropy inputs (e.g., a human-provided number).

### 6.3 Range Mapping

- **Method**: Rejection sampling
- **Chunk size**: Determined by the range. Compute `k` = the minimum number of bytes such that `256^k ≥ range_size`, with `k ≤ 4` (maximum supported range: 2^32 values). Each draw consumes exactly `k` bytes from the CSRNG.
- **Procedure**: Interpret the `k`-byte CSRNG output as a big-endian unsigned integer using `BigInt`. Compute the largest multiple of `range_size` that fits within `256^k`. If the value falls at or above this threshold, discard it and draw the next `k` bytes. Otherwise, compute `value % range_size + min`.
- **Logging**: Every rejected value is logged with an explanation that rejection maintains uniform distribution

### 6.4 CSRNG for Sequential Draws

- **Seeded with**: The XOR-combined value from the three PBKDF2 outputs (32 bytes)
- **Deterministic**: Given the same seed, produces the same sequence — this is required for replay verification
- **Implementation**: AES-256-CTR via the Web Crypto API. The 32-byte combined seed is the AES key. The IV (nonce + counter) is initialized to 16 zero bytes. The plaintext is all zero bytes. The keystream (ciphertext) is the CSRNG output. Output is consumed in chunks of `k` bytes per draw (see §6.3).

### 6.5 Log Hash Chain

- **Algorithm**: SHA-256
- **Serialization**: Each entry's content is canonically serialized as `JSON.stringify({sequence, timestamp, event_type, payload})` and UTF-8 encoded before hashing. This deterministic serialization is required for replay verification across independent implementations.
- **Structure**: `chain_hash = SHA-256(previous_chain_hash_bytes + SHA-256(canonical_entry_bytes))`, where `+` denotes byte concatenation.
- **Genesis entry**: The first entry hashes against a fixed initialization vector of 32 zero bytes.
- **Timestamps**: Each entry includes an ISO 8601 timestamp from the browser's clock.

## 7. User Interface

### 7.1 Primary View

The main interface has three areas:

- **Entropy panel**: Shows the three sources as distinct visual elements. Each source transitions through states: empty → committed (showing PBKDF2 output and QR code) → revealed (showing seed, with verification checkmark). A visual XOR gate graphic shows the combination of all three into the output seed.
- **Output panel**: Displays the current draw result prominently. Shows min/max range. Lists all previous draws in the session.
- **Log panel**: Scrolling, append-only log of all operations with timestamps and running chain hash.

### 7.2 Commitment Indicators

Each commitment must have a clear visual indicator explaining its purpose. An information icon or inline label should communicate that the commitment is a cryptographic lock — it proves the seed was chosen before the human input was received, without revealing what the seed is. This explanation must be understandable to a non-technical observer.

### 7.3 XOR Visualization

The combination step should visually depict the three inputs feeding into an XOR operation producing the combined seed. This makes the independence property visible — the audience can see that all three sources contribute to the result and that no single source determines it.

### 7.4 Rejection Sampling Indicator

When a value is rejected during range mapping, the UI should display a brief, visible notification. An information icon should explain: "This value was discarded because using it would slightly favor some numbers over others. A new value is drawn to ensure every number in the range has exactly equal probability."

### 7.5 Cryptographic Processing Indicator

PBKDF2 operations (≥600,000 iterations) may take several seconds, especially in hardened browsers like Tor Browser where JIT compilation is disabled. During any PBKDF2 computation, the UI must display a progress indicator with an explanatory message (e.g., "Computing cryptographic commitment — this deliberate delay prevents brute-force attacks. Please wait."). The Web Crypto API's async `crypto.subtle.deriveBits` call ensures the UI thread is not blocked.

### 7.6 Presentation Mode

A full-screen mode that enlarges commitments, QR codes, and results for visibility in a room setting. Log detail is collapsed but accessible. QR codes must be large enough to scan from a reasonable audience distance.

### 7.7 Replay Mode

Accepts manual entry of the three seed values and the min/max range. Executes the identical code path as live mode. Produces the same sequence of outputs, allowing independent verification.

### 7.8 Self-Download

A button that offers the original, unmodified HTML file as a download. The file embeds its canonical distribution URL as a constant. On click, it uses `fetch()` to retrieve the file from that URL, ensuring the downloaded copy is byte-identical to the officially hosted version and hashes to the published value. If the fetch fails (e.g., offline), the button is disabled with an explanation.

## 8. Distribution and Verification

### 8.1 Official Hosting

The HTML file and a detached GPG signature (`.sig`) are hosted side by side on an HTTPS website.

### 8.2 Signing Key

- A dedicated GPG signing key is used.
- The key fingerprint is published across multiple independent channels (website, social media, printed materials).
- A signing subkey is used for routine operations, allowing revocation without replacing the primary key.
- The primary key is stored offline.

### 8.3 Verification Flow

1. Download `ceremony.html` and `ceremony.html.sig`.
2. Run `gpg --verify ceremony.html.sig ceremony.html`.
3. Confirm the signing key fingerprint matches published records.
4. Compute `sha256sum ceremony.html` and record the hash.
5. At the ceremony, confirm the displayed file hash matches.

## 9. Platform Requirements

### 9.1 Ceremony Machine

- **OS**: Tails, booted from read-only media (USB or DVD)
- **Browser**: Tor Browser (ships with Tails)
- **Network**: Required only for the random.org fetch in Step 2; can go offline afterward
- **Web Crypto API**: The application requires `crypto.subtle` (PBKDF2, SHA-256, AES-CTR). This API is available in secure contexts; modern Firefox (and Tor Browser based on Firefox ESR) treats `file://` as a secure context. The application must verify `crypto.subtle` availability on load and display a clear, actionable error if it is not present. No pure-JS cryptographic fallbacks are used — this is a deliberate choice to avoid supply-chain risk from non-built-in cryptographic code.

### 9.2 Audience Devices

- Any device with a camera (to photograph QR codes)
- Any device with a browser (to use the replay/verification tool)

### 9.3 Fallback Procedure

If random.org is unreachable (Tor exit node blocked, service downtime), the ceremony procedure should document an alternative second source — for example, public dice rolls captured on video. The application must support manual entry for the second source. A manually entered value receives the same PBKDF2 commitment treatment as the fetched value — commitment is displayed and recorded before proceeding to human input — preserving the commit-then-reveal guarantee.

## 10. Build and Project Structure

### 10.1 Source Organization

The source is a standard multi-file TypeScript project. The single HTML ceremony file is a **build artifact**, not the source. This allows unit testing, linting, modular development, and other engineering best practices.

### 10.2 Build Output

The build process produces a single self-contained HTML file with all JavaScript and CSS inlined. The output file must contain no external resource references beyond the single runtime `fetch()` to random.org.

### 10.3 Embedded Dependencies

- **QR code generation**: The `qrcode-generator` library (by Kazuhiko Arase) is inlined into the output HTML at build time. The build configuration supports two source modes:
  - **CDN URL**: Fetched from a CDN (e.g., `https://cdn.jsdelivr.net/npm/qrcode-generator@...`) at build time and inlined.
  - **Relative path**: Loaded from a local file path (e.g., a vendored copy in the repository).

  The build process must include a comment in the output identifying the library name, version, source URL or path, and a SHA-256 integrity hash of the inlined source, following the Subresource Integrity model.

- **random.org API**: A single HTTPS request to the legacy HTTP API (`https://www.random.org/cgi-bin/randbyte?nbytes=32&format=h`) to fetch 32 random bytes in hexadecimal format. No API key is required. This is the only runtime network dependency.

### 10.4 Testing

Unit tests cover all cryptographic operations (commitment, XOR, rejection sampling, CSRNG, hash chain) and the ceremony state machine. Tests run against the same TypeScript source modules that are bundled into the output.

## 11. Log Schema

Each log entry contains:

| Field | Description |
|---|---|
| `sequence` | Monotonically increasing integer |
| `timestamp` | ISO 8601 timestamp from browser clock |
| `event_type` | One of: `LOCAL_SEED_COMMITTED`, `REMOTE_SEED_COMMITTED`, `PARAMETERS_LOCKED`, `HUMAN_INPUT_RECEIVED`, `SEEDS_REVEALED`, `NUMBER_GENERATED`, `VALUE_REJECTED`, `CEREMONY_RESET` |
| `payload` | Event-specific data (commitment values, seed values, generated numbers, etc.) |
| `chain_hash` | `SHA-256(previous_chain_hash_bytes + SHA-256(JSON.stringify({sequence, timestamp, event_type, payload})))` — see §6.5 for serialization details |

## 12. Success Criteria

- A ceremony can be conducted, recorded, and independently replayed by a third party who was not present, using only the exported log and the published HTML file.
- No single party involved in the ceremony — operator, human input provider, or random.org — can predict or influence the output.
- A non-technical audience member can understand, through the UI alone, why the result is fair.