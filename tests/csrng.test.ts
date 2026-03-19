import { describe, it, expect } from 'vitest';
import { CSRNG } from '../src/csrng';
import { hexEncode } from '../src/crypto';

describe('CSRNG', () => {
  const testSeed = new Uint8Array(32);
  testSeed[0] = 0x42;

  it('rejects non-32-byte seeds', async () => {
    await expect(CSRNG.create(new Uint8Array(16))).rejects.toThrow('32 bytes');
  });

  it('produces output of requested length', async () => {
    const rng = await CSRNG.create(testSeed);
    const bytes = await rng.nextBytes(64);
    expect(bytes.length).toBe(64);
  });

  it('is deterministic: same seed produces same output', async () => {
    const rng1 = await CSRNG.create(testSeed);
    const rng2 = await CSRNG.create(testSeed);

    const a = await rng1.nextBytes(100);
    const b = await rng2.nextBytes(100);
    expect(hexEncode(a)).toBe(hexEncode(b));
  });

  it('sequential reads equal a single large read', async () => {
    const rng1 = await CSRNG.create(testSeed);
    const all = await rng1.nextBytes(20);

    const rng2 = await CSRNG.create(testSeed);
    const first = await rng2.nextBytes(8);
    const second = await rng2.nextBytes(12);

    const combined = new Uint8Array(20);
    combined.set(first, 0);
    combined.set(second, 8);
    expect(hexEncode(combined)).toBe(hexEncode(all));
  });

  it('different seeds produce different output', async () => {
    const seed2 = new Uint8Array(32);
    seed2[0] = 0x43;

    const rng1 = await CSRNG.create(testSeed);
    const rng2 = await CSRNG.create(seed2);

    const a = await rng1.nextBytes(32);
    const b = await rng2.nextBytes(32);
    expect(hexEncode(a)).not.toBe(hexEncode(b));
  });

  it('produces non-trivial output (not all zeros)', async () => {
    const rng = await CSRNG.create(testSeed);
    const bytes = await rng.nextBytes(32);
    expect(bytes.some(b => b !== 0)).toBe(true);
  });
});
