import {
  generateSeed, createCommitment, verifyCommitment, computePBKDF2,
  xorThree, hexEncode, hexDecode, textToBytes, generateRandomBytes,
  deriveHumanContribution,
  type Commitment, PBKDF2_ITERATIONS,
} from './crypto';
import { CSRNG } from './csrng';
import { rejectionSample, type DrawResult } from './sampling';
import { CeremonyLog, type LogEntry, type EventType } from './log';

export type CeremonyStep =
  | 'INIT'
  | 'LOCAL_COMMITTED'
  | 'REMOTE_COMMITTED'
  | 'HUMAN_INPUT_RECEIVED'
  | 'SEEDS_REVEALED'
  | 'VERIFIED'
  | 'DRAWING';

export interface CeremonyState {
  step: CeremonyStep;
  parametersLocked: boolean;
  localSeed: Uint8Array | null;
  localCommitment: Commitment | null;
  remoteSeed: Uint8Array | null;
  remoteCommitment: Commitment | null;
  humanInput: string | null;
  humanCommitment: Commitment | null;
  min: number | null;
  max: number | null;
  allowRepeats: boolean;
  combinedSeed: Uint8Array | null;
  rng: CSRNG | null;
  draws: DrawResult[];
  localVerified: boolean | null;
  remoteVerified: boolean | null;
}

export type CeremonyEventHandler = (entry: LogEntry) => void;

function initialState(): CeremonyState {
  return {
    step: 'INIT',
    parametersLocked: false,
    localSeed: null,
    localCommitment: null,
    remoteSeed: null,
    remoteCommitment: null,
    humanInput: null,
    humanCommitment: null,
    min: null,
    max: null,
    allowRepeats: true,
    combinedSeed: null,
    rng: null,
    draws: [],
    localVerified: null,
    remoteVerified: null,
  };
}

export class Ceremony {
  private state: CeremonyState = initialState();
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

  /**
   * Lock the output range. Can be called at any point during the ceremony.
   * Must be locked before drawing.
   */
  async lockParameters(min: number, max: number, allowRepeats: boolean = true): Promise<void> {
    if (this.state.parametersLocked) {
      throw new Error('Parameters are already locked');
    }
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
    this.state.allowRepeats = allowRepeats;
    this.state.parametersLocked = true;

    await this.emit('PARAMETERS_LOCKED', { min, max, allow_repeats: allowRepeats });
  }

  async receiveHumanInput(input: string): Promise<Commitment> {
    this.assertStep('REMOTE_COMMITTED');

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

  /**
   * Reveal the raw seeds. Visual step — makes seeds available for inspection
   * before verification.
   */
  async revealSeeds(): Promise<{ localSeed: string; remoteSeed: string; humanInput: string }> {
    this.assertStep('HUMAN_INPUT_RECEIVED');

    const { localSeed, remoteSeed, humanInput } = this.state;
    if (!localSeed || !remoteSeed || humanInput === null) {
      throw new Error('Missing seeds or human input');
    }

    this.state.step = 'SEEDS_REVEALED';

    const data = {
      localSeed: hexEncode(localSeed),
      remoteSeed: hexEncode(remoteSeed),
      humanInput,
    };

    await this.emit('SEEDS_REVEALED', {
      local_seed: data.localSeed,
      remote_seed: data.remoteSeed,
      human_input: data.humanInput,
    });

    return data;
  }

  /**
   * Verify commitments against revealed seeds, XOR the raw seeds
   * (local, remote) with the human input's deterministic derivation,
   * and initialize the CSRNG.
   */
  async verifyAndCombine(): Promise<{ localVerified: boolean; remoteVerified: boolean; humanVerified: boolean }> {
    this.assertStep('SEEDS_REVEALED');

    const { localSeed, localCommitment, remoteSeed, remoteCommitment, humanInput, humanCommitment } = this.state;
    if (!localSeed || !localCommitment || !remoteSeed || !remoteCommitment || humanInput === null || !humanCommitment) {
      throw new Error('Missing seeds or commitments');
    }

    const localVerified = await verifyCommitment(localSeed, localCommitment);
    const remoteVerified = await verifyCommitment(remoteSeed, remoteCommitment);
    const humanVerified = await verifyCommitment(textToBytes(humanInput), humanCommitment);

    this.state.localVerified = localVerified;
    this.state.remoteVerified = remoteVerified;

    const humanContribution = await deriveHumanContribution(humanInput);
    const combinedSeed = xorThree(localSeed, remoteSeed, humanContribution);

    this.state.combinedSeed = combinedSeed;
    this.state.rng = await CSRNG.create(combinedSeed);
    this.state.step = 'VERIFIED';

    await this.emit('COMMITMENTS_VERIFIED', {
      local_verified: localVerified,
      remote_verified: remoteVerified,
      human_verified: humanVerified,
      combined_seed: hexEncode(combinedSeed),
    });

    return { localVerified, remoteVerified, humanVerified };
  }

  async draw(): Promise<DrawResult> {
    this.assertStep('VERIFIED', 'DRAWING');

    if (!this.state.parametersLocked) {
      throw new Error('Parameters must be locked before drawing');
    }

    const { rng, min, max, allowRepeats, draws } = this.state;
    if (!rng || min === null || max === null) {
      throw new Error('Missing RNG or parameters');
    }

    if (!allowRepeats) {
      const rangeSize = max - min + 1;
      if (draws.length >= rangeSize) {
        throw new Error('All unique values in the range have been drawn');
      }
    }

    const drawnValues = allowRepeats ? null : new Set(draws.map(d => d.value));
    let result: DrawResult;
    const duplicateRejections: number[] = [];

    for (;;) {
      result = await rejectionSample(rng, min, max);

      for (const rejected of result.rejections) {
        await this.emit('VALUE_REJECTED', {
          rejected_value: rejected.toString(),
          reason: 'Rejection sampling: value exceeds threshold, would introduce modulo bias',
        });
      }

      if (drawnValues && drawnValues.has(result.value)) {
        duplicateRejections.push(result.value);
        await this.emit('VALUE_REJECTED', {
          rejected_value: result.value.toString(),
          reason: 'Duplicate rejection: value already drawn, re-drawing for uniqueness',
        });
        continue;
      }
      break;
    }

    if (duplicateRejections.length > 0) {
      result = { ...result, duplicateRejections };
    }

    this.state.draws.push(result);
    this.state.step = 'DRAWING';

    await this.emit('NUMBER_GENERATED', {
      draw_number: this.state.draws.length,
      value: result.value,
      rejections_count: result.rejections.length,
      duplicate_rejections_count: duplicateRejections.length,
    });

    return result;
  }

  reset(): void {
    this.state = initialState();
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
  allowRepeats: boolean = true,
): Promise<{
  draws: DrawResult[];
  log: CeremonyLog;
  commitments: {
    localPbkdf2: Uint8Array; localSalt: Uint8Array; localIterations: number;
    remotePbkdf2: Uint8Array; remoteSalt: Uint8Array; remoteIterations: number;
    humanPbkdf2: Uint8Array; humanSalt: Uint8Array; humanIterations: number;
  };
}> {
  const localSeed = hexDecode(localSeedHex);
  const remoteSeed = hexDecode(remoteSeedHex);
  const humanBytes = textToBytes(humanInput);

  const localPbkdf2 = await computePBKDF2(localSeed, localSalt, localIterations);
  const remotePbkdf2 = await computePBKDF2(remoteSeed, remoteSalt, remoteIterations);
  const humanPbkdf2 = await computePBKDF2(humanBytes, humanSalt, humanIterations);

  const humanContribution = await deriveHumanContribution(humanInput);
  const combinedSeed = xorThree(localSeed, remoteSeed, humanContribution);
  const rng = await CSRNG.create(combinedSeed);

  const drawnValues = allowRepeats ? null : new Set<number>();
  const draws: DrawResult[] = [];
  for (let i = 0; i < drawCount; i++) {
    const duplicateRejections: number[] = [];
    let result: DrawResult;
    for (;;) {
      result = await rejectionSample(rng, min, max);
      if (drawnValues && drawnValues.has(result.value)) {
        duplicateRejections.push(result.value);
        continue;
      }
      break;
    }
    if (duplicateRejections.length > 0) {
      result = { ...result, duplicateRejections };
    }
    drawnValues?.add(result.value);
    draws.push(result);
  }

  const log = new CeremonyLog();
  return {
    draws, log,
    commitments: {
      localPbkdf2, localSalt, localIterations,
      remotePbkdf2, remoteSalt, remoteIterations,
      humanPbkdf2, humanSalt, humanIterations,
    },
  };
}
