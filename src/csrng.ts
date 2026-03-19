/**
 * Deterministic CSRNG using AES-256-CTR.
 *
 * The 32-byte combined seed is the AES key. IV is 16 zero bytes.
 * Plaintext is all zeros — the AES-CTR keystream IS the pseudorandom output.
 * Output is consumed sequentially in caller-specified chunk sizes.
 */
export class CSRNG {
  private buffer: Uint8Array = new Uint8Array(0);
  private offset = 0;
  private produced = 0;

  private constructor(private key: CryptoKey) {}

  static async create(seed: Uint8Array): Promise<CSRNG> {
    if (seed.length !== 32) {
      throw new Error(`CSRNG seed must be 32 bytes, got ${seed.length}`);
    }
    const key = await crypto.subtle.importKey(
      'raw',
      seed.buffer as ArrayBuffer,
      { name: 'AES-CTR', length: 256 },
      false,
      ['encrypt'],
    );
    return new CSRNG(key);
  }

  /**
   * Pre-generate a block of keystream. We encrypt a large zero buffer
   * to amortize the cost of the Web Crypto call.
   */
  private async expand(minBytes: number): Promise<void> {
    const blockSize = Math.max(minBytes, 4096);
    const roundedSize = Math.ceil(blockSize / 16) * 16;
    const plaintext = new Uint8Array(roundedSize);

    const iv = new Uint8Array(16);
    // Encode the current production offset into the IV as a big-endian block counter.
    // AES-CTR increments internally per 16-byte block, so we set the IV
    // to the block index corresponding to how many bytes we've already produced.
    const blockIndex = BigInt(this.produced) / 16n;
    const view = new DataView(iv.buffer);
    view.setBigUint64(8, blockIndex, false);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter: iv, length: 128 },
      this.key,
      plaintext,
    );

    this.buffer = new Uint8Array(ciphertext);
    this.offset = 0;
    this.produced += this.buffer.length;
  }

  async nextBytes(count: number): Promise<Uint8Array> {
    const result = new Uint8Array(count);
    let written = 0;

    while (written < count) {
      if (this.offset >= this.buffer.length) {
        await this.expand(count - written);
      }
      const available = this.buffer.length - this.offset;
      const toCopy = Math.min(available, count - written);
      result.set(this.buffer.subarray(this.offset, this.offset + toCopy), written);
      this.offset += toCopy;
      written += toCopy;
    }

    return result;
  }
}
