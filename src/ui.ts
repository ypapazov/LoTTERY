import { Ceremony, type CeremonyStep } from './ceremony';
import { fetchRandomOrg, manualEntry } from './random-org';
import { hexEncode } from './crypto';
import { renderQRCode, renderQRCodeLarge } from './qr';
import type { LogEntry } from './log';

declare const __DISTRIBUTION_URL__: string;

const ceremony = new Ceremony();
let presentationMode = false;
let replayMode = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function show(id: string): void {
  $(id).classList.remove('hidden');
}

function hide(id: string): void {
  $(id).classList.add('hidden');
}

function setText(id: string, text: string): void {
  $(id).textContent = text;
}

function setDisabled(id: string, disabled: boolean): void {
  ($(id) as HTMLButtonElement).disabled = disabled;
}

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
}

function showProcessingIndicator(message: string): void {
  setText('processing-message', message);
  show('processing-indicator');
}

function hideProcessingIndicator(): void {
  hide('processing-indicator');
}

function updateStepIndicator(step: CeremonyStep): void {
  const steps: CeremonyStep[] = [
    'INIT', 'LOCAL_COMMITTED', 'REMOTE_COMMITTED',
    'PARAMETERS_LOCKED', 'HUMAN_INPUT_RECEIVED',
    'SEEDS_REVEALED', 'DRAWING',
  ];
  const labels = [
    'Start', 'Local Seed', 'Remote Seed',
    'Parameters', 'Human Input',
    'Verify', 'Draw',
  ];

  const indicator = $('step-indicator');
  indicator.innerHTML = '';
  steps.forEach((s, i) => {
    const span = document.createElement('span');
    span.className = 'step-dot';
    if (s === step) span.classList.add('active');
    else if (steps.indexOf(step) > i) span.classList.add('completed');
    span.title = labels[i];
    span.textContent = labels[i];
    indicator.appendChild(span);
  });
}

function renderCommitmentCard(
  containerId: string,
  qrContainerId: string,
  label: string,
  pbkdf2Hex: string,
  saltHex: string,
  iterations: number,
): void {
  const container = $(containerId);
  container.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'commitment-label';
  title.textContent = label;
  container.appendChild(title);

  const info = document.createElement('div');
  info.className = 'commitment-info';
  info.innerHTML = '<span class="info-icon" title="This is a cryptographic lock. It proves this seed was chosen before other inputs were received, without revealing the seed itself.">&#9432;</span> Committed';
  container.appendChild(info);

  const hashEl = document.createElement('div');
  hashEl.className = 'commitment-hash mono';
  hashEl.textContent = pbkdf2Hex;
  container.appendChild(hashEl);

  const saltEl = document.createElement('div');
  saltEl.className = 'commitment-detail mono';
  saltEl.textContent = `Salt: ${saltHex}`;
  container.appendChild(saltEl);

  const iterEl = document.createElement('div');
  iterEl.className = 'commitment-detail';
  iterEl.textContent = `Iterations: ${iterations.toLocaleString()}`;
  container.appendChild(iterEl);

  const qrData = JSON.stringify({ pbkdf2: pbkdf2Hex, salt: saltHex, iter: iterations });
  const qrContainer = $(qrContainerId);
  if (presentationMode) {
    renderQRCodeLarge(qrData, qrContainer);
  } else {
    renderQRCode(qrData, qrContainer);
  }
}

function renderRevealedSeed(
  containerId: string,
  seedHex: string,
  verified: boolean,
): void {
  const container = $(containerId);
  const reveal = document.createElement('div');
  reveal.className = 'seed-revealed';

  const status = document.createElement('span');
  status.className = verified ? 'verify-pass' : 'verify-fail';
  status.textContent = verified ? ' Verified' : ' MISMATCH';
  reveal.appendChild(status);

  const seedEl = document.createElement('div');
  seedEl.className = 'seed-value mono';
  seedEl.textContent = seedHex;
  reveal.appendChild(seedEl);

  container.appendChild(reveal);
}

async function handleStep1(): Promise<void> {
  setDisabled('btn-generate-local', true);
  showProcessingIndicator(
    'Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026'
  );

  try {
    const commitment = await ceremony.generateLocalSeed();
    renderCommitmentCard(
      'local-seed-card', 'local-seed-qr',
      'Local Seed (Web Crypto)',
      hexEncode(commitment.pbkdf2Output),
      hexEncode(commitment.salt),
      commitment.iterations,
    );
    show('step-remote');
  } finally {
    hideProcessingIndicator();
    updateStepIndicator(ceremony.getState().step);
  }
}

async function handleStep2Fetch(): Promise<void> {
  setDisabled('btn-fetch-remote', true);
  setDisabled('btn-manual-remote', true);
  showProcessingIndicator('Fetching entropy from random.org\u2026');

  try {
    const result = await fetchRandomOrg();
    showProcessingIndicator(
      'Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026'
    );
    const commitment = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitmentCard(
      'remote-seed-card', 'remote-seed-qr',
      `Remote Seed (${result.source})`,
      hexEncode(commitment.pbkdf2Output),
      hexEncode(commitment.salt),
      commitment.iterations,
    );
    show('step-parameters');
  } catch (e) {
    setDisabled('btn-fetch-remote', false);
    setDisabled('btn-manual-remote', false);
    setText('remote-error', `Failed: ${(e as Error).message}. You can enter a value manually.`);
    show('remote-error');
  } finally {
    hideProcessingIndicator();
    updateStepIndicator(ceremony.getState().step);
  }
}

async function handleStep2Manual(): Promise<void> {
  show('manual-remote-input');
}

async function handleStep2ManualSubmit(): Promise<void> {
  const input = ($('manual-remote-hex') as HTMLInputElement).value.trim();

  try {
    const result = manualEntry(input);
    setDisabled('btn-manual-submit', true);
    showProcessingIndicator(
      'Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026'
    );

    const commitment = await ceremony.setRemoteSeed(result.seedHex);
    renderCommitmentCard(
      'remote-seed-card', 'remote-seed-qr',
      `Remote Seed (${result.source})`,
      hexEncode(commitment.pbkdf2Output),
      hexEncode(commitment.salt),
      commitment.iterations,
    );
    hide('manual-remote-input');
    show('step-parameters');
  } catch (e) {
    setText('remote-error', (e as Error).message);
    show('remote-error');
  } finally {
    hideProcessingIndicator();
    updateStepIndicator(ceremony.getState().step);
  }
}

async function handleStep3(): Promise<void> {
  const minVal = parseInt(($('param-min') as HTMLInputElement).value, 10);
  const maxVal = parseInt(($('param-max') as HTMLInputElement).value, 10);

  try {
    await ceremony.lockParameters(minVal, maxVal);
    setText('locked-range', `Range: [${minVal}, ${maxVal}]`);
    show('locked-range');
    show('step-human');
    setDisabled('btn-lock-params', true);
  } catch (e) {
    setText('param-error', (e as Error).message);
    show('param-error');
  }
  updateStepIndicator(ceremony.getState().step);
}

async function handleStep4(): Promise<void> {
  const input = ($('human-input-value') as HTMLInputElement).value.trim();
  if (!input) {
    setText('human-error', 'Please enter a value');
    show('human-error');
    return;
  }

  setDisabled('btn-submit-human', true);
  showProcessingIndicator(
    'Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026'
  );

  try {
    const commitment = await ceremony.receiveHumanInput(input);
    renderCommitmentCard(
      'human-input-card', 'human-input-qr',
      'Human Input',
      hexEncode(commitment.pbkdf2Output),
      hexEncode(commitment.salt),
      commitment.iterations,
    );
    show('step-reveal');
  } catch (e) {
    setDisabled('btn-submit-human', false);
    setText('human-error', (e as Error).message);
    show('human-error');
  } finally {
    hideProcessingIndicator();
    updateStepIndicator(ceremony.getState().step);
  }
}

async function handleStep5(): Promise<void> {
  setDisabled('btn-reveal', true);
  showProcessingIndicator('Verifying commitments\u2026');

  try {
    const result = await ceremony.revealAndVerify();
    const state = ceremony.getState();

    renderRevealedSeed('local-seed-card', hexEncode(state.localSeed!), result.localVerified);
    renderRevealedSeed('remote-seed-card', hexEncode(state.remoteSeed!), result.remoteVerified);

    renderXorVisualization(
      hexEncode(state.localCommitment!.pbkdf2Output),
      hexEncode(state.remoteCommitment!.pbkdf2Output),
      hexEncode(state.humanCommitment!.pbkdf2Output),
      hexEncode(state.combinedSeed!),
    );

    show('xor-visualization');
    show('step-draw');
  } finally {
    hideProcessingIndicator();
    updateStepIndicator(ceremony.getState().step);
  }
}

function renderXorVisualization(
  localHex: string,
  remoteHex: string,
  humanHex: string,
  combinedHex: string,
): void {
  setText('xor-local', localHex.substring(0, 16) + '\u2026');
  setText('xor-remote', remoteHex.substring(0, 16) + '\u2026');
  setText('xor-human', humanHex.substring(0, 16) + '\u2026');
  setText('xor-result', combinedHex.substring(0, 16) + '\u2026');
}

async function handleDraw(): Promise<void> {
  setDisabled('btn-draw', true);

  try {
    const result = await ceremony.draw();
    const state = ceremony.getState();

    setText('draw-result', String(result.value));
    setText('draw-count', `Draw #${state.draws.length}`);
    show('draw-result-panel');

    if (result.rejections.length > 0) {
      const note = $('rejection-notice');
      note.textContent = `${result.rejections.length} value(s) rejected to maintain uniform distribution.`;
      show('rejection-notice');
      setTimeout(() => hide('rejection-notice'), 5000);
    }

    const historyItem = document.createElement('div');
    historyItem.className = 'draw-history-item';
    historyItem.textContent = `#${state.draws.length}: ${result.value}`;
    $('draw-history').appendChild(historyItem);

  } finally {
    setDisabled('btn-draw', false);
    updateStepIndicator(ceremony.getState().step);
  }
}

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
  } catch {
    btn.textContent = 'Download unavailable (offline)';
    btn.title = 'Could not fetch the file from the distribution URL. You may be offline.';
    return;
  }

  btn.disabled = false;
  btn.textContent = 'Download HTML';
}

function handleTogglePresentation(): void {
  presentationMode = !presentationMode;
  document.body.classList.toggle('presentation-mode', presentationMode);
  setText('btn-presentation', presentationMode ? 'Exit Presentation' : 'Presentation Mode');
}

function handleReset(): void {
  if (!confirm('Reset the ceremony? All current data will be lost.')) return;
  ceremony.reset();
  location.reload();
}

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

export function initUI(): void {
  if (!checkCryptoAvailability()) return;

  ceremony.onLogEntry(appendLogEntry);

  updateStepIndicator('INIT');

  $('btn-generate-local').addEventListener('click', handleStep1);
  $('btn-fetch-remote').addEventListener('click', handleStep2Fetch);
  $('btn-manual-remote').addEventListener('click', handleStep2Manual);
  $('btn-manual-submit').addEventListener('click', handleStep2ManualSubmit);
  $('btn-lock-params').addEventListener('click', handleStep3);
  $('btn-submit-human').addEventListener('click', handleStep4);
  $('btn-reveal').addEventListener('click', handleStep5);
  $('btn-draw').addEventListener('click', handleDraw);
  $('btn-export-log').addEventListener('click', handleExportLog);
  $('btn-self-download').addEventListener('click', handleSelfDownload);
  $('btn-presentation').addEventListener('click', handleTogglePresentation);
  $('btn-reset').addEventListener('click', handleReset);
  $('btn-replay-mode').addEventListener('click', () => {
    replayMode = !replayMode;
    document.body.classList.toggle('replay-mode', replayMode);
    if (replayMode) {
      show('replay-panel');
      hide('live-panel');
    } else {
      hide('replay-panel');
      show('live-panel');
    }
  });

  $('btn-replay-run').addEventListener('click', handleReplay);
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
    showProcessingIndicator('Replaying ceremony\u2026');
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
    hideProcessingIndicator();
  }
}
