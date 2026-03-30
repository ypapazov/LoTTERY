export interface Commitment {
  pbkdf2Output: Uint8Array;
  salt: Uint8Array;
  iterations: number;
}

const PBKDF2_ITERATIONS = 600_000;
const SEED_BYTES = 32;

function ensureCryptoSubtle(): SubtleCrypto {
  if (!crypto?.subtle) {
    throw new Error(
      'Web Crypto API (crypto.subtle) is not available. ' +
      'This application requires a secure context. ' +
      'Please open this file in a browser that supports crypto.subtle in the current context.'
    );
  }
  return crypto.subtle;
}

export function generateRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export function generateSeed(): Uint8Array {
  return generateRandomBytes(SEED_BYTES);
}

export async function computePBKDF2(
  input: Uint8Array,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const subtle = ensureCryptoSubtle();
  const keyMaterial = await subtle.importKey(
    'raw', input.buffer as ArrayBuffer, 'PBKDF2', false, ['deriveBits'],
  );
  const derived = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return new Uint8Array(derived);
}

export async function createCommitment(seed: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<Commitment> {
  const salt = generateRandomBytes(32);
  const pbkdf2Output = await computePBKDF2(seed, salt, iterations);
  return { pbkdf2Output, salt, iterations };
}

export async function verifyCommitment(seed: Uint8Array, commitment: Commitment): Promise<boolean> {
  const recomputed = await computePBKDF2(seed, commitment.salt, commitment.iterations);
  return constantTimeEqual(recomputed, commitment.pbkdf2Output);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error(`XOR operands must be the same length (got ${a.length} and ${b.length})`);
  }
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

export function xorThree(a: Uint8Array, b: Uint8Array, c: Uint8Array): Uint8Array {
  return xorBytes(xorBytes(a, b), c);
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const subtle = ensureCryptoSubtle();
  const hash = await subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return new Uint8Array(hash);
}

export function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function hexDecode(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw new Error('Hex string must have even length');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const HUMAN_DOMAIN_SALT = 'LoTTERY';

/**
 * Derive the human input's XOR contribution:
 * PBKDF2-HMAC-SHA-256(input, SHA-256("LoTTERY" || input), 600000)
 *
 * Uses a deterministic, input-dependent salt (domain-separated SHA-256)
 * to avoid precomputation while keeping the derivation reproducible.
 */
export async function deriveHumanContribution(input: string): Promise<Uint8Array> {
  const inputBytes = textToBytes(input);
  const saltInput = textToBytes(HUMAN_DOMAIN_SALT + input);
  const salt = await sha256(saltInput);
  return computePBKDF2(inputBytes, salt, PBKDF2_ITERATIONS);
}

export { PBKDF2_ITERATIONS, SEED_BYTES };
