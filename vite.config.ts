import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import type { Plugin } from 'vite';
import buildConfig from './build.config';

const QR_PKG_PATH = resolve(__dirname, 'node_modules/qrcode-generator/qrcode.js');
const QR_PKG_JSON = resolve(__dirname, 'node_modules/qrcode-generator/package.json');

function sha256Hex(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}
function sha256Base64(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('base64');
}

const qrPkg = JSON.parse(readFileSync(QR_PKG_JSON, 'utf-8'));
const qrSource = readFileSync(QR_PKG_PATH, 'utf-8');
const qrHashHex = sha256Hex(readFileSync(QR_PKG_PATH));
const qrHashB64 = sha256Base64(qrSource);

/**
 * Build-only plugin: resolve `import qrcode from 'qrcode-generator'`
 * to a virtual module that reads from the global `window.qrcode`.
 * The actual library is injected as a separate <script> in closeBundle.
 */
function externalizeQrLibrary(): Plugin {
  const VIRTUAL_ID = '\0qr-external';
  return {
    name: 'externalize-qr-library',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'qrcode-generator') return VIRTUAL_ID;
    },
    load(id) {
      if (id === VIRTUAL_ID) return 'export default window.qrcode;';
    },
  };
}

/**
 * Extract top-level <script> and <style> blocks from the HTML
 * (skipping tags that appear inside other scripts' string content),
 * compute their SHA-256 hashes, and inject a CSP <meta> tag.
 */
function injectCSP(html: string): string {
  const scriptHashes = new Set<string>();
  const styleHashes = new Set<string>();

  // Walk through top-level tags only: find each <script>...</script>,
  // skip its content, then find <style>...</style> outside scripts.
  let pos = 0;
  while (pos < html.length) {
    const scriptOpen = html.indexOf('<script', pos);
    const styleOpen = html.indexOf('<style', pos);

    if (scriptOpen >= 0 && (styleOpen < 0 || scriptOpen < styleOpen)) {
      const tagEnd = html.indexOf('>', scriptOpen);
      if (tagEnd < 0) break;
      const closeTag = '</script>';
      const closeIdx = html.indexOf(closeTag, tagEnd + 1);
      if (closeIdx < 0) break;
      const content = html.slice(tagEnd + 1, closeIdx);
      if (content.trim()) {
        scriptHashes.add(`'sha256-${sha256Base64(content)}'`);
      }
      pos = closeIdx + closeTag.length;
    } else if (styleOpen >= 0) {
      const tagEnd = html.indexOf('>', styleOpen);
      if (tagEnd < 0) break;
      const closeTag = '</style>';
      const closeIdx = html.indexOf(closeTag, tagEnd + 1);
      if (closeIdx < 0) break;
      const content = html.slice(tagEnd + 1, closeIdx);
      if (content.trim()) {
        styleHashes.add(`'sha256-${sha256Base64(content)}'`);
      }
      pos = closeIdx + closeTag.length;
    } else {
      break;
    }
  }

  const directives = [
    `default-src 'none'`,
    `script-src ${[...scriptHashes].join(' ')}`,
    `style-src ${[...styleHashes].join(' ')}`,
    `img-src data: blob:`,
    `connect-src https://www.random.org`,
    `form-action 'none'`,
    `base-uri 'none'`,
  ];

  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${directives.join('; ')}">`;
  const referrerMeta = `<meta name="referrer" content="no-referrer">`;

  return html.replace(
    '<meta charset="UTF-8">',
    `<meta charset="UTF-8">\n  ${cspMeta}\n  ${referrerMeta}`,
  );
}

export default defineConfig({
  root: 'src',
  define: {
    __DOCS_URL__: JSON.stringify(buildConfig.DOCS_URL),
    __QR_LIBRARY_VERSION__: JSON.stringify(qrPkg.version),
    __QR_LIBRARY_INTEGRITY__: JSON.stringify(`sha256-${qrHashHex}`),
  },
  plugins: [
    externalizeQrLibrary(),
    viteSingleFile(),
    {
      name: 'post-build-assembly',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const htmlPath = join(distDir, 'index.html');
        let html = readFileSync(htmlPath, 'utf-8');

        // 1. Inject QR library as separate <script> with SRI before the app module
        const qrComment = [
          `<!-- QR Code Library: qrcode-generator v${qrPkg.version}`,
          `     Author: Kazuhiko Arase`,
          `     License: MIT`,
          `     Source: https://github.com/kazuhikoarase/qrcode-generator`,
          `     NPM: https://www.npmjs.com/package/qrcode-generator`,
          `     Verify: npm pack qrcode-generator@${qrPkg.version} && shasum -a 256 qrcode-generator-${qrPkg.version}.tgz`,
          `     SHA-256 of qrcode.js: ${qrHashHex}`,
          `     This script is the UNMODIFIED qrcode.js from the npm package. -->`,
        ].join('\n  ');
        const qrScriptTag = `${qrComment}\n  <script integrity="sha256-${qrHashB64}">${qrSource}</script>`;

        // Find the HTML-level <script type="module"> — search backward from the end of the
        // file to skip any occurrences inside JS string literals in the bundled code.
        const tagIdx = html.lastIndexOf('<script type="module"');
        if (tagIdx < 0) throw new Error('Could not find app module <script> tag in HTML');
        html = html.slice(0, tagIdx) + qrScriptTag + '\n  ' + html.slice(tagIdx);

        // 2. Inject CSP (picks up both scripts + all styles)
        html = injectCSP(html);
        writeFileSync(htmlPath, html);
        console.log('\nQR library injected as separate <script> with SRI.');
        console.log('CSP meta tag injected with script/style hashes.');

        // 3. Generate SHA256SUMS
        const lines: string[] = [];
        for (const file of readdirSync(distDir)) {
          const fullPath = join(distDir, file);
          if (!statSync(fullPath).isFile() || file === 'SHA256SUMS') continue;
          const hash = sha256Hex(readFileSync(fullPath));
          lines.push(`${hash}  ${file}`);
        }
        const checksums = lines.join('\n') + '\n';
        writeFileSync(join(distDir, 'SHA256SUMS'), checksums);
        console.log(`SHA256SUMS generated:\n${checksums}`);
      },
    },
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: false,
    cssMinify: false,
  },
});
