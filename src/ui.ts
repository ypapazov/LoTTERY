import { Ceremony } from './ceremony';
import { fetchRandomOrg, manualEntry } from './random-org';
import { hexEncode } from './crypto';
import { renderQRCode, renderQRCodeLarge } from './qr';
import type { LogEntry } from './log';
import { t, getLocale, setLocale, initI18n } from './i18n';

declare const __DOCS_URL__: string;

const ceremony = new Ceremony();
let presentationMode = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function show(id: string): void { $(id).classList.remove('hidden'); }
function hide(id: string): void { $(id).classList.add('hidden'); }
function setText(id: string, text: string): void { $(id).textContent = text; }

function setCardState(cardId: string, state: string): void {
  $(cardId).setAttribute('data-state', state);
}

function showProcessing(msg: string): void {
  setText('processing-message', msg);
  show('processing-indicator');
}

function hideProcessing(): void {
  hide('processing-indicator');
}

// ——— Log (child window) ———

let logWindow: Window | null = null;
const pendingLogEntries: LogEntry[] = [];

const LOG_WINDOW_SCRIPT = [
  "window.addEventListener('message',function(e){",
  "  if(e.data&&e.data.type==='log-entry'){",
  "    var d=e.data.entry;",
  "    var el=document.createElement('div');el.className='entry';",
  "    var h=document.createElement('div');h.className='entry-header';",
  "    h.textContent='#'+d.sequence+' ['+d.timestamp+'] '+d.event_type;",
  "    el.appendChild(h);",
  "    var p=document.createElement('pre');p.className='entry-payload';",
  "    p.textContent=JSON.stringify(d.payload,null,2);",
  "    el.appendChild(p);",
  "    var c=document.createElement('div');c.className='entry-hash';",
  "    c.textContent='Chain: '+d.chain_hash;",
  "    el.appendChild(c);",
  "    document.getElementById('entries').appendChild(el);",
  "    el.scrollIntoView({behavior:'smooth'});",
  "  }",
  "  if(e.data&&e.data.type==='chain-qr'){",
  "    document.getElementById('chain-qr').innerHTML=e.data.html;",
  "  }",
  "});",
  "window.opener&&window.opener.postMessage({type:'log-ready'},'*');",
].join('\n');

function getLogWindowHTML(): string {
  const S = `<${['script'].join('')}>`;
  const SE = `</${['script'].join('')}>`;
  return `<!DOCTYPE html>
<html lang="${document.documentElement.lang}">
<head><meta charset="UTF-8"><title>LoTTERY — Log</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#0d1117;color:#e6edf3;font-size:14px;padding:0.5rem}
.chain-qr{text-align:center;padding:0.5rem;border-bottom:1px solid #30363d;margin-bottom:0.5rem}
.chain-qr:empty{display:none}
.chain-qr img{image-rendering:pixelated;max-width:160px;background:#fff;padding:4px;border-radius:4px}
.entry{padding:0.4rem 0.5rem;border-bottom:1px solid #30363d}
.entry-header{font-family:'SF Mono','Cascadia Code','Fira Code',monospace;font-size:0.75rem;color:#58a6ff}
.entry-payload{font-family:'SF Mono','Cascadia Code','Fira Code',monospace;font-size:0.65rem;color:#8b949e;margin:0.15rem 0;white-space:pre-wrap}
.entry-hash{font-family:'SF Mono','Cascadia Code','Fira Code',monospace;font-size:0.6rem;color:#8b949e;word-break:break-all}
</style></head>
<body><div id="chain-qr"></div><div id="entries"></div>
${S}
${LOG_WINDOW_SCRIPT}
${SE}</body></html>`;
}

function openLogWindow(): void {
  if (logWindow && !logWindow.closed) {
    logWindow.focus();
    return;
  }
  logWindow = window.open('', 'lottery-log', 'width=520,height=600,scrollbars=yes,resizable=yes');
  if (!logWindow) return;
  logWindow.document.open();
  logWindow.document.write(getLogWindowHTML());
  logWindow.document.close();

  const flush = () => {
    for (const entry of pendingLogEntries) {
      logWindow!.postMessage({ type: 'log-entry', entry }, '*');
    }
    pendingLogEntries.length = 0;
  };

  window.addEventListener('message', function handler(e) {
    if (e.data?.type === 'log-ready') {
      flush();
      window.removeEventListener('message', handler);
    }
  });

  logWindow.addEventListener('beforeunload', () => {
    $('btn-log-toggle').classList.remove('active');
  });
}

function appendLogEntry(entry: LogEntry): void {
  if (logWindow && !logWindow.closed) {
    logWindow.postMessage({ type: 'log-entry', entry }, '*');
  } else {
    pendingLogEntries.push(entry);
  }
  updateChainQR(entry.chain_hash);
}

function updateChainQR(chainHash: string): void {
  const tempDiv = document.createElement('div');
  if (presentationMode) {
    renderQRCodeLarge(chainHash, tempDiv);
  } else {
    renderQRCode(chainHash, tempDiv);
  }
  if (logWindow && !logWindow.closed) {
    logWindow.postMessage({ type: 'chain-qr', html: tempDiv.innerHTML }, '*');
  }
}

// ——— Documentation (child window) ———

let docWindow: Window | null = null;

const DOC_SECTIONS = [
  'overview', 'commitment', 'sources', 'xor', 'rejection', 'csrng', 'log', 'qr', 'verify',
] as const;

function rejectionSVG(): string {
  const cols = 4, rows = 4;
  const cellW = 80, cellH = 55, gap = 3;
  const gridW = cols * cellW + (cols - 1) * gap;
  const gridH = rows * cellH + (rows - 1) * gap;
  const biasH = cellH;
  const svgW = gridW + 40;
  const svgH = gridH + biasH + gap + 60;
  const ox = 20, oy = 30;
  const green = '#6b8e23', pink = '#e8a0d8';

  let cells = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * (cellW + gap);
      const y = oy + biasH + gap + r * (cellH + gap);
      const idx = r * cols + c;
      cells += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${green}" opacity="0.85"/>`;
      cells += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 5}" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">${idx}</text>`;
    }
  }
  const biasX = ox + (cols - 1) * (cellW + gap);
  const biasY = oy;
  cells += `<rect x="${biasX}" y="${biasY}" width="${cellW}" height="${biasH}" rx="3" fill="${pink}" opacity="0.9"/>`;
  cells += `<text x="${biasX + cellW / 2}" y="${biasY + biasH / 2 + 5}" text-anchor="middle" fill="#1a1a2e" font-size="13" font-weight="700">16</text>`;

  const labelY = svgH - 8;
  const legendX = ox;

  return `<svg viewBox="0 0 ${svgW} ${svgH}" style="max-width:420px;width:100%;margin:1rem auto;display:block">
    <style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style>
    ${cells}
    <rect x="${legendX}" y="${labelY - 10}" width="12" height="12" rx="2" fill="${green}" opacity="0.85"/>
    <text x="${legendX + 18}" y="${labelY}" fill="#c9d1d9" font-size="11">= threshold (16) — ×4 per outcome</text>
    <rect x="${legendX + 260}" y="${labelY - 10}" width="12" height="12" rx="2" fill="${pink}" opacity="0.9"/>
    <text x="${legendX + 278}" y="${labelY}" fill="#c9d1d9" font-size="11">= bias zone — rejected</text>
  </svg>`;
}

function getDocWindowHTML(): string {
  const sections = DOC_SECTIONS.map(id => {
    let extra = '';
    if (id === 'rejection') extra = rejectionSVG();
    return `<section id="${id}">
      <h2>${t(`doc.${id}_title`)}</h2>
      <p>${t(`doc.${id}`)}</p>
      ${extra}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${document.documentElement.lang}">
<head><meta charset="UTF-8"><title>${t('doc.title')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#0d1117;color:#e6edf3;font-size:15px;line-height:1.7;padding:2rem 2.5rem;max-width:720px;margin:0 auto}
h1{font-size:1.3rem;margin-bottom:2rem;color:#58a6ff;border-bottom:1px solid #30363d;padding-bottom:0.75rem}
h2{font-size:1rem;margin:1.5rem 0 0.5rem;color:#58a6ff}
section{border-bottom:1px solid #30363d;padding-bottom:1rem;margin-bottom:0.5rem}
section:last-child{border-bottom:none}
p{color:#c9d1d9}
strong{color:#e6edf3}
em{color:#8b949e}
sup,sub{font-size:0.75em}
code{background:#161b22;padding:0.15rem 0.4rem;border-radius:3px;font-family:'SF Mono','Cascadia Code',monospace;font-size:0.9em}
:target{background:#1f3a5f;border-radius:6px;padding:0.5rem;margin:-0.5rem}
</style></head>
<body>
<h1>${t('doc.title')}</h1>
${sections}
<footer style="margin-top:2rem;padding-top:1rem;border-top:1px solid #30363d;font-size:0.85rem;color:#8b949e">
  <a href="${__DOCS_URL__}" target="_blank" rel="noopener" style="color:#58a6ff">${t('doc.project_link')}</a>
</footer>
</body></html>`;
}

function openDocWindow(scrollTo?: string): void {
  if (docWindow && !docWindow.closed) {
    if (scrollTo) {
      docWindow.location.hash = scrollTo;
    }
    docWindow.focus();
    return;
  }
  docWindow = window.open('', 'lottery-doc', 'width=640,height=700,scrollbars=yes,resizable=yes');
  if (!docWindow) return;
  docWindow.document.open();
  docWindow.document.write(getDocWindowHTML());
  docWindow.document.close();
  if (scrollTo) {
    docWindow.location.hash = scrollTo;
  }
}

// ——— Button state management ———

function syncButtons(): void {
  const state = ceremony.getState();
  const step = state.step;

  const revealBtn = $('btn-reveal') as HTMLButtonElement;
  const verifyBtn = $('btn-verify') as HTMLButtonElement;
  const generateBtn = $('btn-generate') as HTMLButtonElement;

  revealBtn.disabled = step !== 'HUMAN_INPUT_RECEIVED';
  verifyBtn.disabled = step !== 'SEEDS_REVEALED';
  generateBtn.disabled = !(step === 'VERIFIED' && state.parametersLocked);
}

// ——— Commitment rendering ———

function renderCommitment(
  stripQrId: string,
  valueId: string,
  pbkdf2Hex: string,
  saltHex: string,
  iterations: number,
): void {
  const asterisks = '●'.repeat(16) + '…';
  setText(valueId, asterisks);

  const qrData = JSON.stringify({ pbkdf2: pbkdf2Hex, salt: saltHex, iter: iterations });
  const stripContainer = $(stripQrId);
  if (presentationMode) {
    renderQRCodeLarge(qrData, stripContainer);
  } else {
    renderQRCode(qrData, stripContainer);
  }

  const paramsId = stripQrId.replace('-qr', '-params');
  const paramsEl = document.getElementById(paramsId);
  if (paramsEl) {
    paramsEl.innerHTML =
      `<span>salt: ${saltHex}</span>` +
      `<span>iter: ${iterations.toLocaleString()}</span>`;
  }

  $('qr-strip').classList.remove('hidden');
}

function renderRevealed(valueId: string, seedHex: string): void {
  setText(valueId, seedHex);
}

function setLockIcon(lockId: string, icon: 'closed' | 'open' | 'check' | 'x'): void {
  const el = $(lockId);
  const iconMap: Record<string, string> = {
    closed: '#icon-lock-closed',
    open: '#icon-lock-open',
    check: '#icon-check',
    x: '#icon-x',
  };
  el.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28"><use href="${iconMap[icon]}"/></svg>`;
}

// ——— Step handlers ———

async function handleGenerateLocal(): Promise<void> {
  setCardState('card-local', 'active');
  ($('btn-generate-local') as HTMLButtonElement).disabled = true;
  showProcessing(t('processing.commitment'));

  try {
    const c = await ceremony.generateLocalSeed();
    renderCommitment('strip-local-qr', 'local-value',
      hexEncode(c.pbkdf2Output), hexEncode(c.salt), c.iterations);
    setLockIcon('local-lock', 'closed');
    setCardState('card-local', 'committed');
    hide('local-action');

    setCardState('card-remote', 'active');
  } finally {
    hideProcessing();
    syncButtons();
  }
}

async function handleFetchRemote(): Promise<void> {
  ($('btn-fetch-remote') as HTMLButtonElement).disabled = true;
  ($('btn-manual-remote') as HTMLButtonElement).disabled = true;
  showProcessing(t('processing.fetch'));

  try {
    const result = await fetchRandomOrg();
    showProcessing(t('processing.commitment'));
    const c = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitment('strip-remote-qr', 'remote-value',
      hexEncode(c.pbkdf2Output), hexEncode(c.salt), c.iterations);
    setLockIcon('remote-lock', 'closed');
    setCardState('card-remote', 'committed');
    hide('remote-action');

    setCardState('card-human', 'active');
  } catch (e) {
    ($('btn-fetch-remote') as HTMLButtonElement).disabled = false;
    ($('btn-manual-remote') as HTMLButtonElement).disabled = false;
    setText('remote-error', `${t('error.failed_prefix')} ${(e as Error).message}. ${t('error.use_manual')}`);
    show('remote-error');
  } finally {
    hideProcessing();
    syncButtons();
  }
}

function handleShowManual(): void {
  show('manual-remote-input');
}

async function handleManualSubmit(): Promise<void> {
  const hex = ($('manual-remote-hex') as HTMLInputElement).value.trim();
  try {
    const result = manualEntry(hex);
    ($('btn-manual-submit') as HTMLButtonElement).disabled = true;
    showProcessing(t('processing.commitment'));

    const c = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitment('strip-remote-qr', 'remote-value',
      hexEncode(c.pbkdf2Output), hexEncode(c.salt), c.iterations);
    setLockIcon('remote-lock', 'closed');
    setCardState('card-remote', 'committed');
    hide('remote-action');

    setCardState('card-human', 'active');
  } catch (e) {
    setText('remote-error', (e as Error).message);
    show('remote-error');
  } finally {
    hideProcessing();
    syncButtons();
  }
}

async function handleHumanInput(): Promise<void> {
  const input = ($('human-input-value') as HTMLInputElement).value.trim();
  if (!input) {
    setText('human-error', t('error.enter_value'));
    show('human-error');
    return;
  }

  ($('btn-submit-human') as HTMLButtonElement).disabled = true;
  showProcessing(t('processing.commitment'));

  try {
    const c = await ceremony.receiveHumanInput(input);
    renderCommitment('strip-human-qr', 'human-value',
      hexEncode(c.pbkdf2Output), hexEncode(c.salt), c.iterations);
    setLockIcon('human-lock', 'closed');
    setCardState('card-human', 'committed');
    hide('human-action');
  } catch (e) {
    ($('btn-submit-human') as HTMLButtonElement).disabled = false;
    setText('human-error', (e as Error).message);
    show('human-error');
  } finally {
    hideProcessing();
    syncButtons();
  }
}

function handleLockParams(): void {
  const min = parseInt(($('param-min') as HTMLInputElement).value, 10);
  const max = parseInt(($('param-max') as HTMLInputElement).value, 10);
  const allowRepeats = !($('param-unique') as HTMLInputElement).checked;

  ceremony.lockParameters(min, max, allowRepeats).then(() => {
    $('range-panel').classList.add('locked');
    const lockBtn = $('btn-lock-params');
    lockBtn.classList.add('locked');
    lockBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><use href="#icon-lock-closed"/></svg>';
    (lockBtn as HTMLButtonElement).disabled = true;
    ($('param-unique') as HTMLInputElement).disabled = true;
    syncButtons();
  }).catch(e => {
    setText('param-error', (e as Error).message);
    show('param-error');
  });
}

async function handleRevealSeeds(): Promise<void> {
  ($('btn-reveal') as HTMLButtonElement).disabled = true;

  try {
    const data = await ceremony.revealSeeds();
    renderRevealed('local-value', data.localSeed);
    renderRevealed('remote-value', data.remoteSeed);
    setText('human-value', data.humanInput);

    setLockIcon('local-lock', 'open');
    setLockIcon('remote-lock', 'open');
    setLockIcon('human-lock', 'open');
  } finally {
    syncButtons();
  }
}

async function handleVerify(): Promise<void> {
  ($('btn-verify') as HTMLButtonElement).disabled = true;
  showProcessing(t('processing.verify'));

  try {
    const result = await ceremony.verifyAndCombine();

    setLockIcon('local-lock', result.localVerified ? 'check' : 'x');
    setLockIcon('remote-lock', result.remoteVerified ? 'check' : 'x');
    setLockIcon('human-lock', result.humanVerified ? 'check' : 'x');
    setCardState('card-local', result.localVerified ? 'revealed' : 'failed');
    setCardState('card-remote', result.remoteVerified ? 'revealed' : 'failed');
    setCardState('card-human', result.humanVerified ? 'revealed' : 'failed');

    const diagram = $('xor-diagram');
    diagram.classList.add('active', 'animate');
    setTimeout(() => diagram.classList.remove('animate'), 1200);
  } finally {
    hideProcessing();
    syncButtons();
  }
}

async function handleGenerate(): Promise<void> {
  ($('btn-generate') as HTMLButtonElement).disabled = true;
  await performDraw();

  show('output-phase');
  show('draw-bar');
  ($('btn-generate') as HTMLButtonElement).textContent = t('btn.generated');
}

async function handleDrawNext(): Promise<void> {
  ($('btn-draw-next') as HTMLButtonElement).disabled = true;
  await performDraw();

  const state = ceremony.getState();
  if (!state.allowRepeats && state.min !== null && state.max !== null) {
    const rangeSize = state.max - state.min + 1;
    if (state.draws.length >= rangeSize) {
      return;
    }
  }
  ($('btn-draw-next') as HTMLButtonElement).disabled = false;
}

async function performDraw(): Promise<void> {
  const result = await ceremony.draw();
  const state = ceremony.getState();
  const area = $('results-area');

  for (const rejected of result.rejections) {
    const entry = document.createElement('div');
    entry.className = 'rejection-entry';
    entry.innerHTML = `
      <span class="rejection-label">${t('draw.discarded')}</span>
      <span class="rejection-value">${rejected.toString()}</span>
      <span class="info-icon" data-doc="rejection" style="cursor:pointer">&#9432;</span>
    `;
    area.appendChild(entry);
  }

  if (result.duplicateRejections) {
    for (const dup of result.duplicateRejections) {
      const entry = document.createElement('div');
      entry.className = 'rejection-entry duplicate-rejection';
      entry.innerHTML = `
        <span class="rejection-label">${t('draw.duplicate')}</span>
        <span class="rejection-value">${dup}</span>
      `;
      area.appendChild(entry);
    }
  }

  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-meta">${t('draw.meta', { n: String(state.draws.length), time: new Date().toLocaleTimeString() })}</div>
    <div class="result-number">${result.value}</div>
  `;
  area.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ——— Toolbar actions ———

function handleExportLog(): void {
  const data = ceremony.getLog().export();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ceremony-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportLog(): void {
  ($('import-log-file') as HTMLInputElement).click();
}

async function handleImportLogFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const entries: LogEntry[] = JSON.parse(text);
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(t('import.invalid_log'));
    }

    const { verifyLogChain } = await import('./log');
    const badIdx = await verifyLogChain(entries);
    if (badIdx >= 0) {
      const proceed = confirm(t('import.chain_failed', { idx: String(badIdx) }));
      if (!proceed) return;
    }

    let localSeed = '', remoteSeed = '', humanInput = '';
    let localSalt = '', localIter = 600000;
    let remoteSalt = '', remoteIter = 600000;
    let humanSalt = '', humanIter = 600000;
    let min = 1, max = 100, drawCount = 0;

    for (const entry of entries) {
      const p = entry.payload;
      switch (entry.event_type) {
        case 'LOCAL_SEED_COMMITTED':
          localSalt = (p.salt as string) || '';
          localIter = (p.iterations as number) || 600000;
          break;
        case 'REMOTE_SEED_COMMITTED':
          remoteSalt = (p.salt as string) || '';
          remoteIter = (p.iterations as number) || 600000;
          break;
        case 'HUMAN_INPUT_RECEIVED':
          humanSalt = (p.salt as string) || '';
          humanIter = (p.iterations as number) || 600000;
          break;
        case 'SEEDS_REVEALED':
          localSeed = (p.local_seed as string) || '';
          remoteSeed = (p.remote_seed as string) || '';
          humanInput = (p.human_input as string) || '';
          break;
        case 'PARAMETERS_LOCKED':
          min = (p.min as number) ?? 1;
          max = (p.max as number) ?? 100;
          if (p.allow_repeats !== undefined) {
            ($('replay-unique') as HTMLInputElement).checked = !(p.allow_repeats as boolean);
          }
          break;
        case 'NUMBER_GENERATED':
          drawCount++;
          break;
      }
    }

    ($('replay-local-seed') as HTMLInputElement).value = localSeed;
    ($('replay-local-salt') as HTMLInputElement).value = localSalt;
    ($('replay-local-iter') as HTMLInputElement).value = String(localIter);
    ($('replay-remote-seed') as HTMLInputElement).value = remoteSeed;
    ($('replay-remote-salt') as HTMLInputElement).value = remoteSalt;
    ($('replay-remote-iter') as HTMLInputElement).value = String(remoteIter);
    ($('replay-human-input') as HTMLInputElement).value = humanInput;
    ($('replay-human-salt') as HTMLInputElement).value = humanSalt;
    ($('replay-human-iter') as HTMLInputElement).value = String(humanIter);
    ($('replay-min') as HTMLInputElement).value = String(min);
    ($('replay-max') as HTMLInputElement).value = String(max);
    ($('replay-draw-count') as HTMLInputElement).value = String(drawCount || 1);

    show('replay-panel');
    hide('live-panel');
    setText('btn-replay-mode', t('toolbar.live'));
  } catch (e) {
    alert(`${t('import.failed')} ${(e as Error).message}`);
  }

  (event.target as HTMLInputElement).value = '';
}

function handleSelfDownload(): void {
  const a = document.createElement('a');
  a.href = window.location.href;
  a.download = 'ceremony.html';
  a.click();
}

function handleTogglePresentation(): void {
  presentationMode = !presentationMode;
  document.body.classList.toggle('presentation-mode', presentationMode);
  const btn = $('btn-presentation');
  btn.classList.toggle('active', presentationMode);
  setText('btn-presentation', presentationMode ? t('toolbar.exit_presentation') : t('toolbar.presentation'));
}

function handleToggleLog(): void {
  openLogWindow();
  $('btn-log-toggle').classList.add('active');
}

function handleReset(): void {
  if (!confirm(t('confirm.reset'))) return;
  ceremony.reset();
  location.reload();
}

function handleToggleReplay(): void {
  const replay = $('replay-panel');
  const showing = !replay.classList.contains('hidden');
  if (showing) {
    hide('replay-panel');
    show('live-panel');
    setText('btn-replay-mode', t('toolbar.replay'));
  } else {
    show('replay-panel');
    hide('live-panel');
    setText('btn-replay-mode', t('toolbar.live'));
  }
}

async function handleReplay(): Promise<void> {
  const localSeedHex = ($('replay-local-seed') as HTMLInputElement).value.trim();
  const remoteSeedHex = ($('replay-remote-seed') as HTMLInputElement).value.trim();
  const humanInput = ($('replay-human-input') as HTMLInputElement).value.trim();
  const min = parseInt(($('replay-min') as HTMLInputElement).value, 10);
  const max = parseInt(($('replay-max') as HTMLInputElement).value, 10);
  const drawCount = parseInt(($('replay-draw-count') as HTMLInputElement).value, 10);
  const allowRepeats = !($('replay-unique') as HTMLInputElement).checked;

  const localSaltHex = ($('replay-local-salt') as HTMLInputElement).value.trim();
  const localIter = parseInt(($('replay-local-iter') as HTMLInputElement).value, 10);
  const remoteSaltHex = ($('replay-remote-salt') as HTMLInputElement).value.trim();
  const remoteIter = parseInt(($('replay-remote-iter') as HTMLInputElement).value, 10);
  const humanSaltHex = ($('replay-human-salt') as HTMLInputElement).value.trim();
  const humanIter = parseInt(($('replay-human-iter') as HTMLInputElement).value, 10);

  const { hexDecode } = await import('./crypto');
  const { replayCeremony } = await import('./ceremony');

  try {
    showProcessing(t('processing.replay'));
    const result = await replayCeremony(
      localSeedHex, remoteSeedHex, humanInput, min, max, drawCount,
      hexDecode(localSaltHex), localIter,
      hexDecode(remoteSaltHex), remoteIter,
      hexDecode(humanSaltHex), humanIter,
      allowRepeats,
    );

    const { hexEncode: hex } = await import('./crypto');
    const c = result.commitments;

    const renderReplayQR = (containerId: string, pbkdf2: Uint8Array, salt: Uint8Array, iter: number) => {
      const qrData = JSON.stringify({ pbkdf2: hex(pbkdf2), salt: hex(salt), iter });
      renderQRCode(qrData, $(containerId));
    };
    renderReplayQR('replay-local-qr', c.localPbkdf2, c.localSalt, c.localIterations);
    renderReplayQR('replay-remote-qr', c.remotePbkdf2, c.remoteSalt, c.remoteIterations);
    renderReplayQR('replay-human-qr', c.humanPbkdf2, c.humanSalt, c.humanIterations);

    const output = $('replay-results');
    output.innerHTML = '';
    result.draws.forEach((draw, i) => {
      const div = document.createElement('div');
      div.className = 'replay-result-item';
      const dupCount = draw.duplicateRejections?.length ?? 0;
      div.textContent = t('replay.draw_result', { n: String(i + 1), value: String(draw.value) }) +
        (draw.rejections.length > 0 ? ` ${t('replay.rejections', { count: String(draw.rejections.length) })}` : '') +
        (dupCount > 0 ? ` ${t('replay.duplicate_rejections', { count: String(dupCount) })}` : '');
      output.appendChild(div);
    });
    show('replay-results');
  } catch (e) {
    setText('replay-error', (e as Error).message);
    show('replay-error');
  } finally {
    hideProcessing();
  }
}

function handleLangToggle(): void {
  const next = getLocale() === 'bg' ? 'en' : 'bg';
  setLocale(next);
  updateLangButton();
  if (presentationMode) {
    setText('btn-presentation', t('toolbar.exit_presentation'));
  }
}

function updateLangButton(): void {
  const btn = $('btn-lang');
  btn.textContent = getLocale() === 'bg' ? 'EN' : 'BG';
}

// ——— Crypto check ———

function checkCryptoAvailability(): boolean {
  if (!crypto?.subtle) {
    $('app').innerHTML = `
      <div class="fatal-error">
        <h1>${t('error.crypto_title')}</h1>
        <p>${t('error.crypto_body')}</p>
        <p>${t('error.crypto_help')}</p>
      </div>
    `;
    return false;
  }
  return true;
}

// ——— Init ———

export function initUI(): void {
  initI18n();
  updateLangButton();

  if (!checkCryptoAvailability()) return;

  ceremony.onLogEntry(appendLogEntry);

  // Help / documentation
  $('btn-help').addEventListener('click', () => openDocWindow());
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-doc]');
    if (target) openDocWindow(target.getAttribute('data-doc')!);
  });

  // Language toggle
  $('btn-lang').addEventListener('click', handleLangToggle);

  // Source card actions
  $('btn-generate-local').addEventListener('click', handleGenerateLocal);
  $('btn-fetch-remote').addEventListener('click', handleFetchRemote);
  $('btn-manual-remote').addEventListener('click', handleShowManual);
  $('btn-manual-submit').addEventListener('click', handleManualSubmit);
  $('btn-submit-human').addEventListener('click', handleHumanInput);

  // Range
  $('btn-lock-params').addEventListener('click', handleLockParams);

  // Ceremony actions
  $('btn-reveal').addEventListener('click', handleRevealSeeds);
  $('btn-verify').addEventListener('click', handleVerify);
  $('btn-generate').addEventListener('click', handleGenerate);
  $('btn-draw-next').addEventListener('click', handleDrawNext);

  // Toolbar
  $('btn-export-log').addEventListener('click', handleExportLog);
  $('btn-import-log').addEventListener('click', handleImportLog);
  $('import-log-file').addEventListener('change', handleImportLogFile);
  $('btn-self-download').addEventListener('click', handleSelfDownload);
  $('btn-presentation').addEventListener('click', handleTogglePresentation);
  $('btn-reset').addEventListener('click', handleReset);
  $('btn-replay-mode').addEventListener('click', handleToggleReplay);
  $('btn-replay-run').addEventListener('click', handleReplay);
  $('btn-log-toggle').addEventListener('click', handleToggleLog);

  // Initial card state
  setCardState('card-local', 'active');

  syncButtons();
}
