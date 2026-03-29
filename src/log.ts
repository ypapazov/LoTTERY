import { sha256, hexEncode, textToBytes } from './crypto';

export type EventType =
  | 'LOCAL_SEED_COMMITTED'
  | 'REMOTE_SEED_COMMITTED'
  | 'PARAMETERS_LOCKED'
  | 'HUMAN_INPUT_RECEIVED'
  | 'SEEDS_REVEALED'
  | 'COMMITMENTS_VERIFIED'
  | 'NUMBER_GENERATED'
  | 'VALUE_REJECTED'
  | 'CEREMONY_RESET';

export interface LogEntry {
  sequence: number;
  timestamp: string;
  event_type: EventType;
  payload: Record<string, unknown>;
  chain_hash: string;
}

const GENESIS_HASH = new Uint8Array(32); // 32 zero bytes

export function canonicalSerialize(entry: {
  sequence: number;
  timestamp: string;
  event_type: EventType;
  payload: Record<string, unknown>;
}): Uint8Array {
  return textToBytes(JSON.stringify({
    sequence: entry.sequence,
    timestamp: entry.timestamp,
    event_type: entry.event_type,
    payload: entry.payload,
  }));
}

async function computeChainHash(
  previousChainHash: Uint8Array,
  entryBytes: Uint8Array,
): Promise<Uint8Array> {
  const entryHash = await sha256(entryBytes);
  const combined = new Uint8Array(previousChainHash.length + entryHash.length);
  combined.set(previousChainHash, 0);
  combined.set(entryHash, previousChainHash.length);
  return sha256(combined);
}

export class CeremonyLog {
  private entries: LogEntry[] = [];
  private previousChainHash: Uint8Array = GENESIS_HASH;
  private nextSequence = 0;

  async append(eventType: EventType, payload: Record<string, unknown>): Promise<LogEntry> {
    const entry = {
      sequence: this.nextSequence++,
      timestamp: new Date().toISOString(),
      event_type: eventType,
      payload,
    };

    const entryBytes = canonicalSerialize(entry);
    const chainHash = await computeChainHash(this.previousChainHash, entryBytes);
    this.previousChainHash = chainHash;

    const logEntry: LogEntry = {
      ...entry,
      chain_hash: hexEncode(chainHash),
    };

    this.entries.push(logEntry);
    return logEntry;
  }

  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  getLastChainHash(): string {
    if (this.entries.length === 0) return hexEncode(GENESIS_HASH);
    return this.entries[this.entries.length - 1].chain_hash;
  }

  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

/**
 * Verify an exported log's hash chain integrity.
 * Returns the index of the first invalid entry, or -1 if all valid.
 */
export async function verifyLogChain(entries: LogEntry[]): Promise<number> {
  let previousHash: Uint8Array = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryBytes = canonicalSerialize(entry);
    const expected = await computeChainHash(previousHash, entryBytes);
    const expectedHex = hexEncode(expected);

    if (entry.chain_hash !== expectedHex) return i;
    previousHash = expected;
  }

  return -1;
}
