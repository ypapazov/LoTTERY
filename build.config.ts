/**
 * Build configuration for the LoTTERY ceremony HTML file.
 *
 * QR_LIBRARY_SOURCE: Controls where the qrcode-generator library is loaded from.
 *   - "npm"    : Uses the npm-installed package (default, resolved by Vite bundler)
 *   - A URL    : Fetches from CDN at build time (e.g., "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js")
 *   - A path   : Loads from a local/vendored file (e.g., "./vendor/qrcode-generator.js")
 *
 * DISTRIBUTION_URL: The canonical URL where the built HTML file will be hosted.
 *   Used by the self-download feature to fetch a byte-identical copy.
 */
export default {
  QR_LIBRARY_SOURCE: 'npm' as 'npm' | string,
  DISTRIBUTION_URL: 'https://example.com/ceremony.html',
};
