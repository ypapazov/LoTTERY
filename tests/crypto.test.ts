import { describe, it, expect } from 'vitest';
import {
  generateRandomBytes, generateSeed, computePBKDF2, createCommitment,
  verifyCommitment, xorBytes, xorThree, sha256, hexEncode, hexDecode,
  textToBytes, deriveHumanContribution, SEED_BYTES,
} from '../src/crypto';

describe('generateRandomBytes', () => {
  it('returns the requested number of bytes', () => {
    const bytes = generateRandomBytes(32);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
  });

  it('produces different values on successive calls', () => {
    const a = generateRandomBytes(32);
    const b = generateRandomBytes(32);
    expect(hexEncode(a)).not.toBe(hexEncode(b));
  });
});

describe('generateSeed', () => {
  it('returns SEED_BYTES length', () => {
    const seed = generateSeed();
    expect(seed.length).toBe(SEED_BYTES);
  });
});

describe('hexEncode / hexDecode', () => {
  it('roundtrips correctly', () => {
    const original = new Uint8Array([0, 1, 15, 16, 255]);
    const hex = hexEncode(original);
    expect(hex).toBe('00010f10ff');
    const decoded = hexDecode(hex);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('handles whitespace in hex input', () => {
    const decoded = hexDecode('aa bb cc');
    expect(Array.from(decoded)).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it('throws on odd-length hex', () => {
    expect(() => hexDecode('abc')).toThrow('even length');
  });
});

describe('textToBytes', () => {
  it('encodes UTF-8 correctly', () => {
    const bytes = textToBytes('hello');
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });
});

describe('sha256', () => {
  it('hashes empty input to known value', async () => {
    const hash = await sha256(new Uint8Array(0));
    const hex = hexEncode(hash);
    expect(hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hashes "hello" to known value', async () => {
    const hash = await sha256(textToBytes('hello'));
    const hex = hexEncode(hash);
    expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('computePBKDF2', () => {
  it('produces 32-byte output', async () => {
    const input = textToBytes('test');
    const salt = generateRandomBytes(32);
    const output = await computePBKDF2(input, salt, 1000);
    expect(output.length).toBe(32);
  });

  it('is deterministic for same input/salt/iterations', async () => {
    const input = textToBytes('test');
    const salt = new Uint8Array(32);
    const a = await computePBKDF2(input, salt, 1000);
    const b = await computePBKDF2(input, salt, 1000);
    expect(hexEncode(a)).toBe(hexEncode(b));
  });

  it('differs for different salts', async () => {
    const input = textToBytes('test');
    const salt1 = new Uint8Array(32).fill(0);
    const salt2 = new Uint8Array(32).fill(1);
    const a = await computePBKDF2(input, salt1, 1000);
    const b = await computePBKDF2(input, salt2, 1000);
    expect(hexEncode(a)).not.toBe(hexEncode(b));
  });
});

describe('createCommitment / verifyCommitment', () => {
  it('creates and verifies a commitment', async () => {
    const seed = generateSeed();
    const commitment = await createCommitment(seed, 1000);
    expect(commitment.pbkdf2Output.length).toBe(32);
    expect(commitment.salt.length).toBe(32);
    expect(commitment.iterations).toBe(1000);

    const valid = await verifyCommitment(seed, commitment);
    expect(valid).toBe(true);
  });

  it('rejects wrong seed', async () => {
    const seed = generateSeed();
    const wrongSeed = generateSeed();
    const commitment = await createCommitment(seed, 1000);
    const valid = await verifyCommitment(wrongSeed, commitment);
    expect(valid).toBe(false);
  });
});

describe('xorBytes', () => {
  it('XORs two arrays correctly', () => {
    const a = new Uint8Array([0xff, 0x00, 0xaa]);
    const b = new Uint8Array([0x0f, 0xf0, 0x55]);
    const result = xorBytes(a, b);
    expect(Array.from(result)).toEqual([0xf0, 0xf0, 0xff]);
  });

  it('throws on mismatched lengths', () => {
    const a = new Uint8Array(3);
    const b = new Uint8Array(4);
    expect(() => xorBytes(a, b)).toThrow('same length');
  });

  it('XOR with self yields zeros', () => {
    const a = generateRandomBytes(32);
    const result = xorBytes(a, a);
    expect(result.every(b => b === 0)).toBe(true);
  });
});

describe('xorThree', () => {
  it('combines three arrays', () => {
    const a = new Uint8Array([0x01, 0x02]);
    const b = new Uint8Array([0x04, 0x08]);
    const c = new Uint8Array([0x10, 0x20]);
    const result = xorThree(a, b, c);
    expect(Array.from(result)).toEqual([0x15, 0x2a]);
  });
});

describe('deriveHumanContribution', () => {
  it('returns 32 bytes', async () => {
    const result = await deriveHumanContribution('test input');
    expect(result.length).toBe(32);
  });

  it('is deterministic for the same input', async () => {
    const a = await deriveHumanContribution('hello');
    const b = await deriveHumanContribution('hello');
    expect(hexEncode(a)).toBe(hexEncode(b));
  });

  it('produces different outputs for different inputs', async () => {
    const a = await deriveHumanContribution('hello');
    const b = await deriveHumanContribution('world');
    expect(hexEncode(a)).not.toBe(hexEncode(b));
  });
});
