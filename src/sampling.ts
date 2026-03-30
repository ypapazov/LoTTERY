import { CSRNG } from './csrng';

export interface DrawResult {
  value: number;
  rejections: bigint[];
  duplicateRejections?: number[];
}

/**
 * Compute the minimum number of bytes k such that 256^k >= rangeSize, with k <= 4.
 */
export function chunkSize(rangeSize: bigint): number {
  if (rangeSize <= 0n) throw new Error('Range size must be positive');
  if (rangeSize > 2n ** 32n) throw new Error('Range size exceeds maximum supported (2^32)');

  for (let k = 1; k <= 4; k++) {
    if (256n ** BigInt(k) >= rangeSize) return k;
  }
  return 4;
}

/**
 * Interpret k bytes as a big-endian unsigned integer.
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

/**
 * Draw a uniformly random number in [min, max] using rejection sampling.
 * Returns the drawn value and any rejected intermediate values.
 */
export async function rejectionSample(
  rng: CSRNG,
  min: number,
  max: number,
): Promise<DrawResult> {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('min and max must be integers');
  }
  if (min > max) throw new Error('min must be <= max');

  const rangeSize = BigInt(max) - BigInt(min) + 1n;
  const k = chunkSize(rangeSize);
  const outputSpace = 256n ** BigInt(k);
  const threshold = outputSpace - (outputSpace % rangeSize);

  const rejections: bigint[] = [];

  for (;;) {
    const bytes = await rng.nextBytes(k);
    const value = bytesToBigInt(bytes);

    if (value >= threshold) {
      rejections.push(value);
      continue;
    }

    return {
      value: Number(value % rangeSize + BigInt(min)),
      rejections,
    };
  }
}
