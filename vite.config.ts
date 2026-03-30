import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import buildConfig from './build.config';

function computeQrLibraryHash(): string {
  const pkgPath = resolve(__dirname, 'node_modules/qrcode-generator/qrcode.js');
  const content = readFileSync(pkgPath);
  return createHash('sha256').update(content).digest('hex');
}

function sha256Base64(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('base64');
}

/**
 * Extract all inline <script> and <style> blocks from HTML,
 * compute their SHA-256 hashes, and inject a Content-Security-Policy
 * <meta> tag that allowlists exactly those hashes.
 */
function injectCSP(html: string): string {
  const scriptHashes: string[] = [];
  const styleHashes: string[] = [];

  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const content = m[1];
    if (content.trim()) {
      scriptHashes.push(`'sha256-${sha256Base64(content)}'`);
    }
  }

  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html)) !== null) {
    const content = m[1];
    if (content.trim()) {
      styleHashes.push(`'sha256-${sha256Base64(content)}'`);
    }
  }

  const directives = [
    `default-src 'none'`,
    `script-src ${scriptHashes.join(' ')}`,
    `style-src ${styleHashes.join(' ')}`,
    `img-src data: blob:`,
    `connect-src ${buildConfig.DISTRIBUTION_URL} https://www.random.org`,
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

const qrHash = computeQrLibraryHash();
const qrPkg = JSON.parse(
  readFileSync(resolve(__dirname, 'node_modules/qrcode-generator/package.json'), 'utf-8'),
);

export default defineConfig({
  root: 'src',
  define: {
    __DISTRIBUTION_URL__: JSON.stringify(buildConfig.DISTRIBUTION_URL),
    __QR_LIBRARY_VERSION__: JSON.stringify(qrPkg.version),
    __QR_LIBRARY_INTEGRITY__: JSON.stringify(`sha256-${qrHash}`),
  },
  plugins: [
    viteSingleFile(),
    {
      name: 'inject-qr-sri-comment',
      transformIndexHtml(html) {
        const comment = [
          `<!-- QR Code Library: qrcode-generator v${qrPkg.version}`,
          `     Author: Kazuhiko Arase`,
          `     Source: https://github.com/kazuhikoarase/qrcode-generator`,
          `     NPM: https://www.npmjs.com/package/qrcode-generator`,
          `     Integrity: sha256-${qrHash}`,
          `     This library is embedded inline and is part of the auditable surface. -->`,
        ].join('\n');
        return html.replace('</head>', `${comment}\n</head>`);
      },
    },
    {
      name: 'inject-csp-and-checksums',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const htmlPath = join(distDir, 'index.html');

        // 1. Inject CSP meta tag with SHA-256 hashes of all inline scripts/styles
        let html = readFileSync(htmlPath, 'utf-8');
        html = injectCSP(html);
        writeFileSync(htmlPath, html);
        console.log('\nCSP meta tag injected with script/style hashes.');

        // 2. Generate SHA256SUMS (after CSP injection so hash reflects final file)
        const lines: string[] = [];
        for (const file of readdirSync(distDir)) {
          const fullPath = join(distDir, file);
          if (!statSync(fullPath).isFile() || file === 'SHA256SUMS') continue;
          const hash = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
          lines.push(`${hash}  ${file}`);
        }
        const content = lines.join('\n') + '\n';
        writeFileSync(join(distDir, 'SHA256SUMS'), content);
        console.log(`SHA256SUMS generated:\n${content}`);
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
