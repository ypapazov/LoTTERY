# LoTTERY — UI Specification

## 1. Layout Overview

The application is a single vertically-scrollable page with two visual phases: the **ceremony phase** (visible on initial load, no scroll) and the **output phase** (revealed by scrolling down). The transition between phases is continuous — scrolling collapses the ceremony layout into a compact verification bar and reveals the output area beneath.

The primary target viewport is a laptop projected to a room-sized audience in landscape orientation.

## 2. Ceremony Phase (Top of Page)

### 2.1 Source Cards

Three source cards are arranged in a **diagonal configuration at approximately 30 degrees from horizontal**, stepping upward from left to right. Each card is a vertical column containing, from top to bottom:

1. **QR code** — renders the commitment payload (PBKDF2 output, salt, iteration count). Sized for scannability from audience distance when projected.
2. **Lock indicator** — closed/amber when committed, open/green when revealed and verified, red on verification failure.
3. **Value field** — monospaced, fixed-width. Displays asterisks while the seed is committed. Displays the raw seed value after reveal. Fixed width prevents layout shift on state change.
4. **Source label and icon** — identifies the source:
   - Left column: Local CSRNG (chip/device icon)
   - Middle column: random.org (cloud icon)
   - Right column: Human Input (keyboard/person icon)

Each card is interactive only during its ceremony step. Cards not yet active are visually muted. Cards that have completed their step show the committed state with the lock closed.

### 2.2 Diagonal Layout Purpose

The 30-degree diagonal achieves two simultaneous goals:

- **Horizontal separation** communicates that the three sources are independent and equal — no card is visually dominant.
- **Vertical stagger** communicates temporal sequence — the eye follows the slope, reading the ceremony order naturally without explicit step numbers.

### 2.3 Commitment Indicator

Each QR code has an adjacent information icon. On hover or tap, it displays an explanation: the commitment is a cryptographic lock proving the seed was chosen before later inputs were received, without revealing the seed itself. The language must be understandable to a non-technical observer.

### 2.4 XOR Visualization

Below the three source cards, a visual diagram shows three lines descending from the cards into two cascaded XOR gate symbols. The first gate combines sources 1 and 2. The second gate combines that result with source 3. A single output line exits downward.

The diagram is non-interactive. During the combination step, the lines animate — filling or highlighting sequentially to show data flowing from sources through gates to output. This makes the combination visible as an event, not just a static diagram.

### 2.5 Min/Max Panel

Below the XOR visualization. Two numeric input fields side by side labeled "Min" and "Max". A lock button commits the range. Once locked, fields become read-only and the lock icon closes. Can be set at any point before generation. Must be locked before the Generate button activates.

### 2.6 Generate Button

Full-width button below the Min/Max panel. Disabled (visually greyed) until all three sources are committed and the range is locked. On click, triggers the full sequence: reveal seeds → verify commitments → XOR combine → rejection-sample → output result.

After the first generation, the button label changes to "Draw Next" for subsequent sequential draws from the same CSRNG stream.

## 3. Scroll Transition

When the user scrolls down past the ceremony phase:

- The three source cards collapse. The QR codes detach from their diagonal positions and **pin to the top of the viewport in a horizontal row** — three QR codes side by side, evenly spaced, each with its source label beneath.
- The value fields, lock indicators, and XOR diagram scroll away.
- The sticky QR row remains fixed at the top for the remainder of the scroll range.

This transition serves three purposes:

- Reclaims vertical space for the output area.
- Keeps commitments permanently visible and scannable by audience members regardless of scroll position.
- Creates a clear visual shift from "ceremony setup" to "ceremony results," mirroring the actual phase change in the protocol.

Each QR code in the sticky row is tappable/clickable to expand it for easier scanning.

## 4. Output Phase (Below Fold)

### 4.1 Results Area

Each generated number appears as a prominent result card showing:

- Sequence number (Draw #1, #2, ...)
- The generated value, displayed large
- Timestamp

New draws append downward. The area grows as more numbers are generated, scrollable indefinitely.

### 4.2 Rejection Sampling Entries

When a value is discarded during rejection sampling, it appears as a smaller, greyed-out entry between result cards. It displays:

- The rejected value
- A label: "Discarded — statistical fairness"
- An information icon that expands to explain: "This value was discarded because using it would slightly favor some numbers over others. A new value is drawn to ensure every number in the range has exactly equal probability."

### 4.3 Log Panel

A collapsible drawer accessible via a tab or button at the bottom or side of the screen. Contains the full append-only ceremony log with:

- Sequence numbers
- Timestamps
- Event types
- Payloads
- Running chain hash for each entry

In presentation mode, the log is collapsed by default to avoid visual clutter. It can be expanded for inspection or exported as a file.

### 4.4 Hash Chain QR

At the bottom of the log panel (or as a persistent element near the sticky QR row), a QR code renders the current chain hash. This updates with each log entry. Audience members can photograph it at any point to anchor their verification.

## 5. Replay Mode

Accessed via a toggle or separate tab. Presents the same three-column layout but with editable value fields for manual seed entry instead of generated/fetched values. Shares the identical code path for combination, range mapping, and output generation. The UI is visually distinguished (e.g., a banner or color shift indicating "Replay / Verification Mode") to prevent confusion with a live ceremony.

## 6. Self-Download Button

A button (positioned in a toolbar or footer area, not in the main ceremony flow) that downloads the original, unmodified HTML file. The original source is captured as a string constant on page load before any DOM manipulation, ensuring byte-identical output. The button label indicates this clearly: "Download Original Tool" or similar.

## 7. Presentation Mode

A toggle that optimizes the layout for projection:

- Enlarges QR codes, result values, and commitment displays.
- Hides secondary UI elements (log panel, download button, replay toggle).
- Maximizes contrast and font sizes.
- The sticky QR row in this mode uses larger QR codes optimized for scanning from room distance.

## 8. Visual Design Principles

- **No decorative elements.** Every visual component communicates either ceremony state or security information. The tool's credibility depends on looking functional, not polished.
- **State changes are visible.** Commitments, locks, reveals, and generation steps are accompanied by clear color and icon transitions. An audience member glancing at the screen mid-ceremony can determine the current state at a glance.
- **Information icons, not inline text.** Cryptographic explanations are available on demand, not cluttering the default view. The default view is clean enough for a non-technical audience to follow the ceremony flow.
- **Monospaced values.** All seeds, hashes, and commitments are displayed in a monospaced typeface for readability and to signal "this is exact data, not prose."
- **High contrast.** Designed for projection in variable lighting conditions. No light greys on white. QR codes are standard black-on-white for maximum scanner compatibility.

## 9. Responsive Behavior

The primary target is landscape projection from a laptop. On narrow viewports (portrait tablet, phone), the diagonal collapses to a horizontal row or a vertical stack. The sticky QR behavior remains the same. The output area reflows to full-width single column. This is a secondary concern — the tool is designed to be operated on a laptop, with audience members using their own devices only for QR scanning and post-ceremony verification.