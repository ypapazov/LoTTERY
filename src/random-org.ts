const RANDOM_ORG_URL = 'https://www.random.org/cgi-bin/randbyte?nbytes=32&format=h';
const FETCH_TIMEOUT_MS = 30_000;

export interface RemoteSeedResult {
  seedHex: string;
  source: 'random.org' | 'manual';
}

export async function fetchRandomOrg(): Promise<RemoteSeedResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(RANDOM_ORG_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`random.org returned HTTP ${response.status}`);
    }
    const text = await response.text();
    const seedHex = text.replace(/\s+/g, '').toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(seedHex)) {
      throw new Error(`Unexpected response format from random.org: expected 64 hex chars, got "${seedHex.substring(0, 80)}"`);
    }

    return { seedHex, source: 'random.org' };
  } finally {
    clearTimeout(timeout);
  }
}

export function manualEntry(hexValue: string): RemoteSeedResult {
  const clean = hexValue.replace(/\s+/g, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('Manual entry must be exactly 64 hex characters (32 bytes)');
  }
  return { seedHex: clean, source: 'manual' };
}
