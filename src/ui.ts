import { Ceremony } from './ceremony';
import { fetchRandomOrg, manualEntry } from './random-org';
import { hexEncode } from './crypto';
import { renderQRCode, renderQRCodeLarge } from './qr';
import type { LogEntry } from './log';

declare const __DISTRIBUTION_URL__: string;

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

// ——— Log ———

function appendLogEntry(entry: LogEntry): void {
  const panel = $('log-entries');
  const div = document.createElement('div');
  div.className = 'log-entry';

  const header = document.createElement('div');
  header.className = 'log-entry-header';
  header.textContent = `#${entry.sequence} [${entry.timestamp}] ${entry.event_type}`;
  div.appendChild(header);

  const payload = document.createElement('pre');
  payload.className = 'log-entry-payload';
  payload.textContent = JSON.stringify(entry.payload, null, 2);
  div.appendChild(payload);

  const hash = document.createElement('div');
  hash.className = 'log-entry-hash';
  hash.textContent = `Chain: ${entry.chain_hash}`;
  div.appendChild(hash);

  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;

  updateChainQR(entry.chain_hash);
}

function updateChainQR(chainHash: string): void {
  const container = $('log-chain-qr');
  if (presentationMode) {
    renderQRCodeLarge(chainHash, container);
  } else {
    renderQRCode(chainHash, container);
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
  qrContainerId: string,
  valueId: string,
  pbkdf2Hex: string,
  saltHex: string,
  iterations: number,
): void {
  const asterisks = '●'.repeat(16) + '…';
  setText(valueId, asterisks);

  const qrData = JSON.stringify({ pbkdf2: pbkdf2Hex, salt: saltHex, iter: iterations });
  const qrContainer = $(qrContainerId);
  if (presentationMode) {
    renderQRCodeLarge(qrData, qrContainer);
  } else {
    renderQRCode(qrData, qrContainer);
  }
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
  showProcessing('Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026');

  try {
    const c = await ceremony.generateLocalSeed();
    renderCommitment('local-qr', 'local-value',
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
  showProcessing('Fetching entropy from random.org\u2026');

  try {
    const result = await fetchRandomOrg();
    showProcessing('Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026');
    const c = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitment('remote-qr', 'remote-value',
      hexEncode(c.pbkdf2Output), hexEncode(c.salt), c.iterations);
    setLockIcon('remote-lock', 'closed');
    setCardState('card-remote', 'committed');
    hide('remote-action');

    setCardState('card-human', 'active');
  } catch (e) {
    ($('btn-fetch-remote') as HTMLButtonElement).disabled = false;
    ($('btn-manual-remote') as HTMLButtonElement).disabled = false;
    setText('remote-error', `Failed: ${(e as Error).message}. Use manual entry.`);
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
    showProcessing('Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026');

    const c = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitment('remote-qr', 'remote-value',
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
    setText('human-error', 'Please enter a value');
    show('human-error');
    return;
  }

  ($('btn-submit-human') as HTMLButtonElement).disabled = true;
  showProcessing('Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026');

  try {
    const c = await ceremony.receiveHumanInput(input);
    renderCommitment('human-qr', 'human-value',
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

  ceremony.lockParameters(min, max).then(() => {
    $('range-panel').classList.add('locked');
    const lockBtn = $('btn-lock-params');
    lockBtn.classList.add('locked');
    lockBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><use href="#icon-lock-closed"/></svg>';
    (lockBtn as HTMLButtonElement).disabled = true;
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
  showProcessing('Verifying commitments\u2026');

  try {
    const result = await ceremony.verifyAndCombine();

    setLockIcon('local-lock', result.localVerified ? 'check' : 'x');
    setLockIcon('remote-lock', result.remoteVerified ? 'check' : 'x');
    setCardState('card-local', result.localVerified ? 'revealed' : 'failed');
    setCardState('card-remote', result.remoteVerified ? 'revealed' : 'failed');
    setCardState('card-human', 'revealed');
    setLockIcon('human-lock', 'check');

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
  ($('btn-generate') as HTMLButtonElement).textContent = 'Generated';
}

async function handleDrawNext(): Promise<void> {
  ($('btn-draw-next') as HTMLButtonElement).disabled = true;
  await performDraw();
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
      <span class="rejection-label">Discarded</span>
      <span class="rejection-value">${rejected.toString()}</span>
      <span class="info-icon" title="This value was discarded because using it would slightly favor some numbers over others. A new value is drawn to ensure every number in the range has exactly equal probability.">&#9432;</span>
    `;
    area.appendChild(entry);
  }

  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-meta">Draw #${state.draws.length} &mdash; ${new Date().toLocaleTimeString()}</div>
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

async function handleSelfDownload(): Promise<void> {
  const btn = $('btn-self-download') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Downloading…';

  try {
    const response = await fetch(__DISTRIBUTION_URL__);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ceremony.html';
    a.click();
    URL.revokeObjectURL(url);
    btn.disabled = false;
    btn.textContent = 'Download HTML';
  } catch {
    btn.textContent = 'Unavailable (offline)';
    btn.title = 'Could not fetch from distribution URL.';
  }
}

function handleTogglePresentation(): void {
  presentationMode = !presentationMode;
  document.body.classList.toggle('presentation-mode', presentationMode);
  setText('btn-presentation', presentationMode ? 'Exit Presentation' : 'Presentation');
}

function handleToggleLog(): void {
  const drawer = $('log-drawer');
  const open = drawer.classList.toggle('open');
  setText('btn-log-toggle', open ? 'Log ▼' : 'Log ▲');
}

function handleReset(): void {
  if (!confirm('Reset the ceremony? All current data will be lost.')) return;
  ceremony.reset();
  location.reload();
}

function handleToggleReplay(): void {
  const replay = $('replay-panel');
  const showing = !replay.classList.contains('hidden');
  if (showing) {
    hide('replay-panel');
    show('live-panel');
    setText('btn-replay-mode', 'Replay');
  } else {
    show('replay-panel');
    hide('live-panel');
    setText('btn-replay-mode', 'Live');
  }
}

async function handleReplay(): Promise<void> {
  const localSeedHex = ($('replay-local-seed') as HTMLInputElement).value.trim();
  const remoteSeedHex = ($('replay-remote-seed') as HTMLInputElement).value.trim();
  const humanInput = ($('replay-human-input') as HTMLInputElement).value.trim();
  const min = parseInt(($('replay-min') as HTMLInputElement).value, 10);
  const max = parseInt(($('replay-max') as HTMLInputElement).value, 10);
  const drawCount = parseInt(($('replay-draw-count') as HTMLInputElement).value, 10);

  const localSaltHex = ($('replay-local-salt') as HTMLInputElement).value.trim();
  const localIter = parseInt(($('replay-local-iter') as HTMLInputElement).value, 10);
  const remoteSaltHex = ($('replay-remote-salt') as HTMLInputElement).value.trim();
  const remoteIter = parseInt(($('replay-remote-iter') as HTMLInputElement).value, 10);
  const humanSaltHex = ($('replay-human-salt') as HTMLInputElement).value.trim();
  const humanIter = parseInt(($('replay-human-iter') as HTMLInputElement).value, 10);

  const { hexDecode } = await import('./crypto');
  const { replayCeremony } = await import('./ceremony');

  try {
    showProcessing('Replaying ceremony\u2026');
    const result = await replayCeremony(
      localSeedHex, remoteSeedHex, humanInput, min, max, drawCount,
      hexDecode(localSaltHex), localIter,
      hexDecode(remoteSaltHex), remoteIter,
      hexDecode(humanSaltHex), humanIter,
    );

    const output = $('replay-results');
    output.innerHTML = '';
    result.draws.forEach((draw, i) => {
      const div = document.createElement('div');
      div.className = 'replay-result-item';
      div.textContent = `Draw #${i + 1}: ${draw.value}` +
        (draw.rejections.length > 0 ? ` (${draw.rejections.length} rejections)` : '');
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

// ——— Crypto check ———

function checkCryptoAvailability(): boolean {
  if (!crypto?.subtle) {
    $('app').innerHTML = `
      <div class="fatal-error">
        <h1>Web Crypto API Unavailable</h1>
        <p>This application requires <code>crypto.subtle</code>, which is only available in secure contexts.</p>
        <p>Please open this file in a browser that supports the Web Crypto API.
           If using Tor Browser, ensure you are running a recent version based on Firefox ESR.</p>
      </div>
    `;
    return false;
  }
  return true;
}

// ——— Init ———

export function initUI(): void {
  if (!checkCryptoAvailability()) return;

  ceremony.onLogEntry(appendLogEntry);

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
