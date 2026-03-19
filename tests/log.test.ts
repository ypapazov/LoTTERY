import { describe, it, expect } from 'vitest';
import { CeremonyLog, verifyLogChain, canonicalSerialize } from '../src/log';
import { hexEncode } from '../src/crypto';

describe('canonicalSerialize', () => {
  it('produces deterministic JSON bytes', () => {
    const entry = {
      sequence: 0,
      timestamp: '2025-01-01T00:00:00.000Z',
      event_type: 'LOCAL_SEED_COMMITTED' as const,
      payload: { test: 'value' },
    };
    const a = canonicalSerialize(entry);
    const b = canonicalSerialize(entry);
    expect(hexEncode(a)).toBe(hexEncode(b));
  });

  it('preserves field order from JSON.stringify', () => {
    const entry = {
      sequence: 1,
      timestamp: '2025-01-01T00:00:00.000Z',
      event_type: 'PARAMETERS_LOCKED' as const,
      payload: { min: 1, max: 100 },
    };
    const bytes = canonicalSerialize(entry);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed)).toEqual(['sequence', 'timestamp', 'event_type', 'payload']);
  });
});

describe('CeremonyLog', () => {
  it('starts with genesis hash', () => {
    const log = new CeremonyLog();
    const lastHash = log.getLastChainHash();
    expect(lastHash).toBe('0'.repeat(64));
  });

  it('appends entries with incrementing sequence', async () => {
    const log = new CeremonyLog();
    await log.append('LOCAL_SEED_COMMITTED', { test: 1 });
    await log.append('REMOTE_SEED_COMMITTED', { test: 2 });
    const entries = log.getEntries();
    expect(entries.length).toBe(2);
    expect(entries[0].sequence).toBe(0);
    expect(entries[1].sequence).toBe(1);
  });

  it('produces non-zero chain hashes', async () => {
    const log = new CeremonyLog();
    const entry = await log.append('LOCAL_SEED_COMMITTED', { data: 'test' });
    expect(entry.chain_hash).not.toBe('0'.repeat(64));
    expect(entry.chain_hash.length).toBe(64);
  });

  it('each entry has a different chain hash', async () => {
    const log = new CeremonyLog();
    const e1 = await log.append('LOCAL_SEED_COMMITTED', { a: 1 });
    const e2 = await log.append('REMOTE_SEED_COMMITTED', { b: 2 });
    expect(e1.chain_hash).not.toBe(e2.chain_hash);
  });

  it('exports valid JSON', async () => {
    const log = new CeremonyLog();
    await log.append('LOCAL_SEED_COMMITTED', { test: true });
    const json = log.export();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});

describe('verifyLogChain', () => {
  it('verifies a valid chain', async () => {
    const log = new CeremonyLog();
    await log.append('LOCAL_SEED_COMMITTED', { a: 1 });
    await log.append('REMOTE_SEED_COMMITTED', { b: 2 });
    await log.append('PARAMETERS_LOCKED', { min: 1, max: 100 });

    const entries = [...log.getEntries()];
    const invalidIdx = await verifyLogChain(entries);
    expect(invalidIdx).toBe(-1);
  });

  it('detects tampered chain hash', async () => {
    const log = new CeremonyLog();
    await log.append('LOCAL_SEED_COMMITTED', { a: 1 });
    await log.append('REMOTE_SEED_COMMITTED', { b: 2 });

    const entries = JSON.parse(log.export());
    entries[1].chain_hash = 'ff'.repeat(32);

    const invalidIdx = await verifyLogChain(entries);
    expect(invalidIdx).toBe(1);
  });

  it('detects tampered payload', async () => {
    const log = new CeremonyLog();
    await log.append('LOCAL_SEED_COMMITTED', { value: 'original' });

    const entries = JSON.parse(log.export());
    entries[0].payload.value = 'tampered';

    const invalidIdx = await verifyLogChain(entries);
    expect(invalidIdx).toBe(0);
  });

  it('returns -1 for empty log', async () => {
    const invalidIdx = await verifyLogChain([]);
    expect(invalidIdx).toBe(-1);
  });
});
