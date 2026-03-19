import { describe, it, expect } from 'vitest';
import { chunkSize, rejectionSample } from '../src/sampling';
import { CSRNG } from '../src/csrng';

describe('chunkSize', () => {
  it('returns 1 for small ranges', () => {
    expect(chunkSize(1n)).toBe(1);
    expect(chunkSize(100n)).toBe(1);
    expect(chunkSize(256n)).toBe(1);
  });

  it('returns 2 for ranges up to 65536', () => {
    expect(chunkSize(257n)).toBe(2);
    expect(chunkSize(1000n)).toBe(2);
    expect(chunkSize(65536n)).toBe(2);
  });

  it('returns 3 for ranges up to 16777216', () => {
    expect(chunkSize(65537n)).toBe(3);
    expect(chunkSize(1000000n)).toBe(3);
    expect(chunkSize(16777216n)).toBe(3);
  });

  it('returns 4 for large ranges', () => {
    expect(chunkSize(16777217n)).toBe(4);
    expect(chunkSize(2n ** 32n)).toBe(4);
  });

  it('throws for zero or negative range', () => {
    expect(() => chunkSize(0n)).toThrow('positive');
    expect(() => chunkSize(-1n)).toThrow('positive');
  });

  it('throws for ranges exceeding 2^32', () => {
    expect(() => chunkSize(2n ** 32n + 1n)).toThrow('maximum');
  });
});

describe('rejectionSample', () => {
  const testSeed = new Uint8Array(32);
  testSeed[0] = 0x42;

  it('produces values within range', async () => {
    const rng = await CSRNG.create(testSeed);
    for (let i = 0; i < 50; i++) {
      const result = await rejectionSample(rng, 1, 100);
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(100);
    }
  });

  it('handles min === max', async () => {
    const rng = await CSRNG.create(testSeed);
    const result = await rejectionSample(rng, 42, 42);
    expect(result.value).toBe(42);
  });

  it('is deterministic for same seed', async () => {
    const rng1 = await CSRNG.create(testSeed);
    const rng2 = await CSRNG.create(testSeed);

    const results1 = [];
    const results2 = [];
    for (let i = 0; i < 10; i++) {
      results1.push((await rejectionSample(rng1, 1, 1000)).value);
      results2.push((await rejectionSample(rng2, 1, 1000)).value);
    }
    expect(results1).toEqual(results2);
  });

  it('throws for min > max', async () => {
    const rng = await CSRNG.create(testSeed);
    await expect(rejectionSample(rng, 10, 5)).rejects.toThrow('min must be <= max');
  });

  it('throws for non-integer inputs', async () => {
    const rng = await CSRNG.create(testSeed);
    await expect(rejectionSample(rng, 1.5, 10)).rejects.toThrow('integers');
  });

  it('handles large ranges', async () => {
    const rng = await CSRNG.create(testSeed);
    const result = await rejectionSample(rng, 0, 1000000);
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1000000);
  });

  it('reports rejections when they occur', async () => {
    // With range 1-200 and 1-byte chunks (256 output space),
    // threshold is 200, so values 200-255 are rejected (~22% chance).
    // Run many draws to statistically expect some rejections.
    const rng = await CSRNG.create(testSeed);
    let totalRejections = 0;
    for (let i = 0; i < 100; i++) {
      const result = await rejectionSample(rng, 1, 200);
      totalRejections += result.rejections.length;
    }
    // With 22% rejection rate over 100 draws, very unlikely to see 0 rejections
    expect(totalRejections).toBeGreaterThan(0);
  });
});
