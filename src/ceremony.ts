import {
  generateSeed, createCommitment, verifyCommitment, computePBKDF2,
  xorThree, hexEncode, hexDecode, textToBytes, generateRandomBytes,
  type Commitment, PBKDF2_ITERATIONS,
} from './crypto';
import { CSRNG } from './csrng';
import { rejectionSample, type DrawResult } from './sampling';
import { CeremonyLog, type LogEntry, type EventType } from './log';

export type CeremonyStep =
  | 'INIT'
  | 'LOCAL_COMMITTED'
  | 'REMOTE_COMMITTED'
  | 'PARAMETERS_LOCKED'
  | 'HUMAN_INPUT_RECEIVED'
  | 'SEEDS_REVEALED'
  | 'DRAWING';

export interface CeremonyState {
  step: CeremonyStep;
  localSeed: Uint8Array | null;
  localCommitment: Commitment | null;
  remoteSeed: Uint8Array | null;
  remoteCommitment: Commitment | null;
  humanInput: string | null;
  humanCommitment: Commitment | null;
  min: number | null;
  max: number | null;
  combinedSeed: Uint8Array | null;
  rng: CSRNG | null;
  draws: DrawResult[];
  localVerified: boolean | null;
  remoteVerified: boolean | null;
}

export type CeremonyEventHandler = (entry: LogEntry) => void;

export class Ceremony {
  private state: CeremonyState = {
    step: 'INIT',
    localSeed: null,
    localCommitment: null,
    remoteSeed: null,
    remoteCommitment: null,
    humanInput: null,
    humanCommitment: null,
    min: null,
    max: null,
    combinedSeed: null,
    rng: null,
    draws: [],
    localVerified: null,
    remoteVerified: null,
  };

  private log = new CeremonyLog();
  private listeners: CeremonyEventHandler[] = [];

  getState(): Readonly<CeremonyState> {
    return this.state;
  }

  getLog(): CeremonyLog {
    return this.log;
  }

  onLogEntry(handler: CeremonyEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  private async emit(eventType: EventType, payload: Record<string, unknown>): Promise<LogEntry> {
    const entry = await this.log.append(eventType, payload);
    for (const listener of this.listeners) {
      listener(entry);
    }
    return entry;
  }

  private assertStep(...allowed: CeremonyStep[]): void {
    if (!allowed.includes(this.state.step)) {
      throw new Error(
        `Invalid ceremony state: expected one of [${allowed.join(', ')}], got ${this.state.step}`
      );
    }
  }

  async generateLocalSeed(): Promise<Commitment> {
    this.assertStep('INIT');

    const seed = generateSeed();
    const commitment = await createCommitment(seed);

    this.state.localSeed = seed;
    this.state.localCommitment = commitment;
    this.state.step = 'LOCAL_COMMITTED';

    await this.emit('LOCAL_SEED_COMMITTED', {
      pbkdf2_output: hexEncode(commitment.pbkdf2Output),
      salt: hexEncode(commitment.salt),
      iterations: commitment.iterations,
    });

    return commitment;
  }

  async setRemoteSeed(remoteSeedHex: string): Promise<Commitment> {
    this.assertStep('LOCAL_COMMITTED');

    const seed = hexDecode(remoteSeedHex);
    if (seed.length !== 32) {
      throw new Error(`Remote seed must be 32 bytes, got ${seed.length}`);
    }

    const commitment = await createCommitment(seed);

    this.state.remoteSeed = seed;
    this.state.remoteCommitment = commitment;
    this.state.step = 'REMOTE_COMMITTED';

    await this.emit('REMOTE_SEED_COMMITTED', {
      pbkdf2_output: hexEncode(commitment.pbkdf2Output),
      salt: hexEncode(commitment.salt),
      iterations: commitment.iterations,
    });

    return commitment;
  }

  async lockParameters(min: number, max: number): Promise<void> {
    this.assertStep('REMOTE_COMMITTED');

    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('min and max must be integers');
    }
    if (min > max) throw new Error('min must be <= max');

    const rangeSize = BigInt(max) - BigInt(min) + 1n;
    if (rangeSize > 2n ** 32n) {
      throw new Error('Range size exceeds maximum supported (2^32)');
    }

    this.state.min = min;
    this.state.max = max;
    this.state.step = 'PARAMETERS_LOCKED';

    await this.emit('PARAMETERS_LOCKED', { min, max });
  }

  async receiveHumanInput(input: string): Promise<Commitment> {
    this.assertStep('PARAMETERS_LOCKED');

    const inputBytes = textToBytes(input);
    const salt = generateRandomBytes(32);
    const pbkdf2Output = await computePBKDF2(inputBytes, salt, PBKDF2_ITERATIONS);

    const commitment: Commitment = { pbkdf2Output, salt, iterations: PBKDF2_ITERATIONS };

    this.state.humanInput = input;
    this.state.humanCommitment = commitment;
    this.state.step = 'HUMAN_INPUT_RECEIVED';

    await this.emit('HUMAN_INPUT_RECEIVED', {
      pbkdf2_output: hexEncode(commitment.pbkdf2Output),
      salt: hexEncode(commitment.salt),
      iterations: commitment.iterations,
    });

    return commitment;
  }

  async revealAndVerify(): Promise<{ localVerified: boolean; remoteVerified: boolean }> {
    this.assertStep('HUMAN_INPUT_RECEIVED');

    const { localSeed, localCommitment, remoteSeed, remoteCommitment } = this.state;
    if (!localSeed || !localCommitment || !remoteSeed || !remoteCommitment) {
      throw new Error('Missing seeds or commitments');
    }

    const localVerified = await verifyCommitment(localSeed, localCommitment);
    const remoteVerified = await verifyCommitment(remoteSeed, remoteCommitment);

    this.state.localVerified = localVerified;
    this.state.remoteVerified = remoteVerified;

    const combinedSeed = xorThree(
      localCommitment.pbkdf2Output,
      remoteCommitment.pbkdf2Output,
      this.state.humanCommitment!.pbkdf2Output,
    );

    this.state.combinedSeed = combinedSeed;
    this.state.rng = await CSRNG.create(combinedSeed);
    this.state.step = 'SEEDS_REVEALED';

    await this.emit('SEEDS_REVEALED', {
      local_seed: hexEncode(localSeed),
      remote_seed: hexEncode(remoteSeed),
      human_input: this.state.humanInput,
      local_verified: localVerified,
      remote_verified: remoteVerified,
      combined_seed: hexEncode(combinedSeed),
    });

    return { localVerified, remoteVerified };
  }

  async draw(): Promise<DrawResult> {
    this.assertStep('SEEDS_REVEALED', 'DRAWING');

    const { rng, min, max } = this.state;
    if (!rng || min === null || max === null) {
      throw new Error('Missing RNG or parameters');
    }

    const result = await rejectionSample(rng, min, max);

    for (const rejected of result.rejections) {
      await this.emit('VALUE_REJECTED', {
        rejected_value: rejected.toString(),
        reason: 'Rejection sampling: value exceeds threshold, would introduce modulo bias',
      });
    }

    this.state.draws.push(result);
    this.state.step = 'DRAWING';

    await this.emit('NUMBER_GENERATED', {
      draw_number: this.state.draws.length,
      value: result.value,
      rejections_count: result.rejections.length,
    });

    return result;
  }

  reset(): void {
    this.state = {
      step: 'INIT',
      localSeed: null,
      localCommitment: null,
      remoteSeed: null,
      remoteCommitment: null,
      humanInput: null,
      humanCommitment: null,
      min: null,
      max: null,
      combinedSeed: null,
      rng: null,
      draws: [],
      localVerified: null,
      remoteVerified: null,
    };
    this.log = new CeremonyLog();
  }
}

/**
 * Replay a ceremony from known seeds and parameters.
 * Uses the exact same code path as live mode.
 */
export async function replayCeremony(
  localSeedHex: string,
  remoteSeedHex: string,
  humanInput: string,
  min: number,
  max: number,
  drawCount: number,
  localSalt: Uint8Array,
  localIterations: number,
  remoteSalt: Uint8Array,
  remoteIterations: number,
  humanSalt: Uint8Array,
  humanIterations: number,
): Promise<{ draws: DrawResult[]; log: CeremonyLog }> {
  const localSeed = hexDecode(localSeedHex);
  const remoteSeed = hexDecode(remoteSeedHex);
  const humanBytes = textToBytes(humanInput);

  const localPbkdf2 = await computePBKDF2(localSeed, localSalt, localIterations);
  const remotePbkdf2 = await computePBKDF2(remoteSeed, remoteSalt, remoteIterations);
  const humanPbkdf2 = await computePBKDF2(humanBytes, humanSalt, humanIterations);

  const combinedSeed = xorThree(localPbkdf2, remotePbkdf2, humanPbkdf2);
  const rng = await CSRNG.create(combinedSeed);

  const draws: DrawResult[] = [];
  for (let i = 0; i < drawCount; i++) {
    draws.push(await rejectionSample(rng, min, max));
  }

  const log = new CeremonyLog();
  return { draws, log };
}
