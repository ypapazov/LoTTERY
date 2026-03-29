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
      name: 'generate-sha256sums',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const lines: string[] = [];
        for (const file of readdirSync(distDir)) {
          const fullPath = join(distDir, file);
          if (!statSync(fullPath).isFile() || file === 'SHA256SUMS') continue;
          const hash = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
          lines.push(`${hash}  ${file}`);
        }
        const content = lines.join('\n') + '\n';
        writeFileSync(join(distDir, 'SHA256SUMS'), content);
        console.log(`\nSHA256SUMS generated:\n${content}`);
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
