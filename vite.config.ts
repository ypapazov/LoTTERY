import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: false,
    cssMinify: false,
  },
});
