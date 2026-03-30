/**
 * Build configuration for the LoTTERY ceremony HTML file.
 *
 * QR_LIBRARY_SOURCE: Controls where the qrcode-generator library is loaded from.
 *   - "npm"    : Uses the npm-installed package (default, resolved by Vite bundler)
 *   - A URL    : Fetches from CDN at build time (e.g., "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js")
 *   - A path   : Loads from a local/vendored file (e.g., "./vendor/qrcode-generator.js")
 *
 * DOCS_URL: Project homepage where verification materials live
 *   (GPG signatures, SHA256SUMS, instructions). Linked from the UI.
 */
export default {
  QR_LIBRARY_SOURCE: 'npm' as 'npm' | string,
  DOCS_URL: 'https://github.com/ypapazov/LoTTERY',
};
