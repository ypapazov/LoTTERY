#!/usr/bin/env node
/**
 * Auditor's decomposition tool for dist/index.html.
 *
 * Parses the built HTML file and produces a report covering:
 * - Every <script> and <style> block with SHA-256 hashes and sizes
 * - CSP meta tag cross-verification (are all hashes accounted for?)
 * - SRI integrity verification on the QR library script
 * - Inventory of all URLs referenced in JavaScript
 * - Top-level JS declarations (via acorn AST walk)
 */

import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const FILE = resolve(process.argv[2] || 'dist/index.html');

function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function sha256b64(data) {
  return createHash('sha256').update(data).digest('base64');
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const OK = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let exitCode = 0;
function pass(msg) { console.log(`  ${OK} ${msg}`); }
function fail(msg) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }
function warn(msg) { console.log(`  ${WARN} ${msg}`); }
function heading(msg) { console.log(`\n${BOLD}--- ${msg} ---${RESET}`); }

// ─── Load file ───

let html;
try {
  html = readFileSync(FILE, 'utf-8');
} catch {
  console.error(`Cannot read ${FILE}`);
  process.exit(1);
}

const fileSize = statSync(FILE).size;
const fileHash = sha256hex(html);

console.log(`\n${BOLD}=== LoTTERY Validation Report ===${RESET}`);
console.log(`  File: ${FILE}`);
console.log(`  Size: ${fmt(fileSize)}`);
console.log(`  SHA-256: ${fileHash}`);

// ─── Parse HTML ───

const $ = cheerio.load(html);

// ─── Meta tags ───

heading('Meta Tags');

const cspMeta = $('meta[http-equiv="Content-Security-Policy"]').attr('content') || '';
if (cspMeta) {
  pass('CSP meta tag found');
  const directives = cspMeta.split(';').map(d => d.trim()).filter(Boolean);
  for (const d of directives) {
    console.log(`    ${DIM}${d}${RESET}`);
  }
} else {
  fail('No CSP meta tag found');
}

const referrer = $('meta[name="referrer"]').attr('content') || '';
if (referrer) {
  pass(`Referrer-Policy: ${referrer}`);
} else {
  warn('No referrer meta tag');
}

// ─── Extract scripts ───

heading('Scripts');

// Extract scripts from raw HTML to get exact bytes (cheerio .text() can alter whitespace)
const scripts = [];
const scriptRanges = []; // [start, end] pairs for filtering style matches inside scripts
const scriptTagRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let scriptMatch;
while ((scriptMatch = scriptTagRe.exec(html)) !== null) {
  const attrs = scriptMatch[1];
  const content = scriptMatch[2];
  if (!content.trim()) continue;

  scriptRanges.push([scriptMatch.index, scriptMatch.index + scriptMatch[0].length]);

  const integrityMatch = attrs.match(/integrity="([^"]+)"/);
  const integrity = integrityMatch ? integrityMatch[1] : null;
  const isModule = /type="module"/.test(attrs);
  const hashHex = sha256hex(content);
  const hashB64 = sha256b64(content);

  let label = 'Inline script';
  if (integrity) label = 'QR library (qrcode-generator)';
  else if (isModule) label = 'Application module';

  scripts.push({
    index: scripts.length + 1,
    label, content, hashHex, hashB64, integrity, isModule,
    size: Buffer.byteLength(content, 'utf-8'),
  });
}

const cspScriptHashes = new Set();
const scriptSrcMatch = cspMeta.match(/script-src\s+([^;]+)/);
if (scriptSrcMatch) {
  for (const m of scriptSrcMatch[1].matchAll(/'sha256-([^']+)'/g)) {
    cspScriptHashes.add(m[1]);
  }
}

for (const s of scripts) {
  console.log(`\n  #${s.index}: ${BOLD}${s.label}${RESET}`);
  console.log(`    Size: ${fmt(s.size)}`);
  console.log(`    SHA-256 (hex): ${s.hashHex}`);
  console.log(`    SHA-256 (b64): ${s.hashB64}`);

  if (s.integrity) {
    const expected = s.integrity.replace('sha256-', '');
    if (expected === s.hashB64) {
      pass('Integrity attribute matches content');
    } else {
      fail(`Integrity MISMATCH: attr=${expected} computed=${s.hashB64}`);
    }
  }

  if (cspScriptHashes.has(s.hashB64)) {
    pass('Hash present in CSP script-src');
    cspScriptHashes.delete(s.hashB64);
  } else {
    fail('Hash NOT found in CSP script-src');
  }
}

if (cspScriptHashes.size > 0) {
  for (const orphan of cspScriptHashes) {
    fail(`CSP contains unmatched script hash: sha256-${orphan}`);
  }
} else if (scripts.length > 0) {
  pass('All CSP script hashes accounted for');
}

// ─── npm registry verification ───

heading('npm Registry Verification');

const qrScript = scripts.find(s => s.integrity);
if (qrScript) {
  // Extract version from the HTML comment above the script
  const versionMatch = html.match(/QR Code Library: qrcode-generator v([\d.]+)/);
  const version = versionMatch ? versionMatch[1] : null;

  if (!version) {
    warn('Could not find QR library version in HTML comments');
  } else {
    console.log(`  Package: qrcode-generator@${version}`);
    const tarballUrl = `https://registry.npmjs.org/qrcode-generator/-/qrcode-generator-${version}.tgz`;
    console.log(`  Tarball: ${tarballUrl}`);

    try {
      const resp = await fetch(tarballUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const tgzBuf = Buffer.from(await resp.arrayBuffer());
      console.log(`  Downloaded: ${fmt(tgzBuf.length)}`);

      const tarBuf = gunzipSync(tgzBuf);

      // Parse tar to find package/qrcode.js
      // Tar format: 512-byte headers, filename at offset 0 (100 bytes, null-terminated),
      // file size at offset 124 (12 bytes, octal string)
      let found = false;
      let offset = 0;
      while (offset + 512 <= tarBuf.length) {
        const header = tarBuf.subarray(offset, offset + 512);
        if (header.every(b => b === 0)) break;

        const nameRaw = header.subarray(0, 100);
        const name = nameRaw.subarray(0, nameRaw.indexOf(0)).toString('utf-8');
        const sizeStr = header.subarray(124, 124 + 12).toString('utf-8').trim();
        const size = parseInt(sizeStr, 8) || 0;
        const dataOffset = offset + 512;

        if (name === 'package/qrcode.js' || name === './package/qrcode.js') {
          const fileData = tarBuf.subarray(dataOffset, dataOffset + size);
          const npmHash = sha256b64(fileData);
          const npmHashHex = sha256hex(fileData);
          console.log(`  Extracted: ${name} (${fmt(size)})`);
          console.log(`    SHA-256 (hex): ${npmHashHex}`);
          console.log(`    SHA-256 (b64): ${npmHash}`);

          const embeddedHash = qrScript.integrity.replace('sha256-', '');
          if (npmHash === embeddedHash) {
            pass('npm package hash matches integrity attribute');
          } else {
            fail(`npm MISMATCH: npm=${npmHash} integrity=${embeddedHash}`);
          }

          if (npmHash === qrScript.hashB64) {
            pass('npm package hash matches embedded script content');
          } else {
            fail(`npm vs content MISMATCH: npm=${npmHash} content=${qrScript.hashB64}`);
          }
          found = true;
          break;
        }

        offset = dataOffset + Math.ceil(size / 512) * 512;
      }

      if (!found) {
        fail('Could not find qrcode.js in npm tarball');
      }
    } catch (e) {
      warn(`npm fetch failed: ${e.message} (offline? re-run with network access)`);
    }
  }
} else {
  warn('No script with integrity attribute found — skipping npm check');
}

// ─── Extract styles ───

heading('Styles');

const styles = [];
const styleTagRe = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
let styleMatch;
while ((styleMatch = styleTagRe.exec(html)) !== null) {
  const pos = styleMatch.index;
  const insideScript = scriptRanges.some(([s, e]) => pos > s && pos < e);
  if (insideScript) continue;

  const content = styleMatch[2];
  if (!content.trim()) continue;
  styles.push({
    index: styles.length + 1,
    content,
    hashHex: sha256hex(content),
    hashB64: sha256b64(content),
    size: Buffer.byteLength(content, 'utf-8'),
  });
}

const cspStyleHashes = new Set();
const styleSrcMatch = cspMeta.match(/style-src\s+([^;]+)/);
if (styleSrcMatch) {
  for (const m of styleSrcMatch[1].matchAll(/'sha256-([^']+)'/g)) {
    cspStyleHashes.add(m[1]);
  }
}

for (const s of styles) {
  console.log(`\n  #${s.index}: ${BOLD}Application styles${RESET}`);
  console.log(`    Size: ${fmt(s.size)}`);
  console.log(`    SHA-256 (hex): ${s.hashHex}`);
  console.log(`    SHA-256 (b64): ${s.hashB64}`);

  if (cspStyleHashes.has(s.hashB64)) {
    pass('Hash present in CSP style-src');
    cspStyleHashes.delete(s.hashB64);
  } else {
    fail('Hash NOT found in CSP style-src');
  }
}

if (cspStyleHashes.size > 0) {
  for (const orphan of cspStyleHashes) {
    fail(`CSP contains unmatched style hash: sha256-${orphan}`);
  }
} else if (styles.length > 0) {
  pass('All CSP style hashes accounted for');
}

// ─── CSP connect-src ───

heading('Network Policy (CSP connect-src)');

const connectMatch = cspMeta.match(/connect-src\s+([^;]+)/);
if (connectMatch) {
  const origins = connectMatch[1].trim().split(/\s+/);
  for (const origin of origins) {
    console.log(`    ${origin}`);
  }
} else {
  warn('No connect-src directive found');
}

// ─── JS URL inventory ───

heading('URL Inventory (from JavaScript)');

const urlSet = new Set();
for (const s of scripts) {
  const urlRe = /https?:\/\/[^\s'"`,)}\]]+/g;
  let m;
  while ((m = urlRe.exec(s.content)) !== null) {
    urlSet.add(m[0]);
  }
}

if (urlSet.size === 0) {
  pass('No URLs found in scripts');
} else {
  for (const url of [...urlSet].sort()) {
    console.log(`    ${url}`);
  }
  console.log(`  ${urlSet.size} unique URL(s) found`);
}

// ─── JS AST analysis of the application module ───

heading('Application Module Structure (acorn AST)');

const appScript = scripts.find(s => s.isModule);
if (appScript) {
  try {
    const ast = acorn.parse(appScript.content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });

    const topLevelFunctions = [];
    const topLevelClasses = [];
    const topLevelConsts = [];
    let cryptoSubtleCalls = 0;

    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration' && node.id) {
        topLevelFunctions.push(node.id.name);
      }
      if (node.type === 'ClassDeclaration' && node.id) {
        topLevelClasses.push(node.id.name);
      }
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          if (decl.id?.name) topLevelConsts.push(decl.id.name);
        }
      }
    }

    walk.simple(ast, {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object?.property?.name === 'subtle'
        ) {
          cryptoSubtleCalls++;
        }
      },
    });

    if (topLevelClasses.length > 0) {
      console.log(`  Classes (${topLevelClasses.length}):`);
      for (const name of topLevelClasses) console.log(`    ${name}`);
    }
    if (topLevelFunctions.length > 0) {
      console.log(`  Functions (${topLevelFunctions.length}):`);
      for (const name of topLevelFunctions) console.log(`    ${name}`);
    }
    if (topLevelConsts.length > 0) {
      console.log(`  Top-level variables (${topLevelConsts.length}):`);
      for (const name of topLevelConsts) console.log(`    ${name}`);
    }
    console.log(`  crypto.subtle.* calls: ${cryptoSubtleCalls}`);
  } catch (e) {
    warn(`Acorn parse error: ${e.message}`);
  }
} else {
  warn('No module script found for AST analysis');
}

// ─── External resource check ───

heading('External Resources');

const externalEls = [];
$('[src], [href]').each((_, el) => {
  const src = $(el).attr('src') || $(el).attr('href') || '';
  if (src.startsWith('http://') || src.startsWith('https://')) {
    externalEls.push(`<${el.tagName}> ${src}`);
  }
});

if (externalEls.length === 0) {
  pass('No external resource references in HTML attributes');
} else {
  for (const ref of externalEls) {
    warn(ref);
  }
}

// ─── Summary ───

heading('Summary');
console.log(`  ${scripts.length} script(s), ${styles.length} style(s)`);
console.log(`  File hash: ${fileHash}`);
if (exitCode === 0) {
  console.log(`\n  ${OK} ${BOLD}All checks passed${RESET}\n`);
} else {
  console.log(`\n  ${FAIL} ${BOLD}Some checks failed${RESET}\n`);
}

process.exit(exitCode);
