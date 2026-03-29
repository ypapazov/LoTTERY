import { describe, it, expect } from 'vitest';
import { Ceremony } from '../src/ceremony';

describe('Ceremony state machine', () => {
  it('starts at INIT', () => {
    const c = new Ceremony();
    expect(c.getState().step).toBe('INIT');
    expect(c.getState().parametersLocked).toBe(false);
  });

  it('enforces source step ordering', async () => {
    const c = new Ceremony();

    await expect(c.setRemoteSeed('aa'.repeat(32))).rejects.toThrow('Invalid ceremony state');
    await expect(c.receiveHumanInput('42')).rejects.toThrow('Invalid ceremony state');
    await expect(c.revealSeeds()).rejects.toThrow('Invalid ceremony state');
    await expect(c.verifyAndCombine()).rejects.toThrow('Invalid ceremony state');
    await expect(c.draw()).rejects.toThrow('Invalid ceremony state');
  });

  it('allows locking parameters at any step', async () => {
    const c = new Ceremony();
    await c.lockParameters(1, 100);
    expect(c.getState().parametersLocked).toBe(true);
    expect(c.getState().min).toBe(1);
    expect(c.getState().max).toBe(100);
  });

  it('prevents locking parameters twice', async () => {
    const c = new Ceremony();
    await c.lockParameters(1, 100);
    await expect(c.lockParameters(1, 200)).rejects.toThrow('already locked');
  });

  it('progresses through all steps correctly', async () => {
    const c = new Ceremony();
    const events: string[] = [];
    c.onLogEntry(e => events.push(e.event_type));

    await c.generateLocalSeed();
    expect(c.getState().step).toBe('LOCAL_COMMITTED');

    await c.setRemoteSeed('bb'.repeat(32));
    expect(c.getState().step).toBe('REMOTE_COMMITTED');

    await c.lockParameters(1, 100);

    await c.receiveHumanInput('42');
    expect(c.getState().step).toBe('HUMAN_INPUT_RECEIVED');

    const seeds = await c.revealSeeds();
    expect(c.getState().step).toBe('SEEDS_REVEALED');
    expect(seeds.humanInput).toBe('42');
    expect(seeds.remoteSeed).toBe('bb'.repeat(32));

    const verification = await c.verifyAndCombine();
    expect(verification.localVerified).toBe(true);
    expect(verification.remoteVerified).toBe(true);
    expect(c.getState().step).toBe('VERIFIED');

    const draw1 = await c.draw();
    expect(draw1.value).toBeGreaterThanOrEqual(1);
    expect(draw1.value).toBeLessThanOrEqual(100);
    expect(c.getState().step).toBe('DRAWING');

    const draw2 = await c.draw();
    expect(draw2.value).toBeGreaterThanOrEqual(1);
    expect(draw2.value).toBeLessThanOrEqual(100);

    const coreEvents = events.filter(e => e !== 'VALUE_REJECTED');
    expect(coreEvents).toEqual([
      'LOCAL_SEED_COMMITTED',
      'REMOTE_SEED_COMMITTED',
      'PARAMETERS_LOCKED',
      'HUMAN_INPUT_RECEIVED',
      'SEEDS_REVEALED',
      'COMMITMENTS_VERIFIED',
      'NUMBER_GENERATED',
      'NUMBER_GENERATED',
    ]);
  });

  it('requires parameters locked before drawing', async () => {
    const c = new Ceremony();
    await c.generateLocalSeed();
    await c.setRemoteSeed('bb'.repeat(32));
    await c.receiveHumanInput('42');
    await c.revealSeeds();
    await c.verifyAndCombine();

    await expect(c.draw()).rejects.toThrow('Parameters must be locked');
  });

  it('allows parameters locked after verification', async () => {
    const c = new Ceremony();
    await c.generateLocalSeed();
    await c.setRemoteSeed('bb'.repeat(32));
    await c.receiveHumanInput('42');
    await c.revealSeeds();
    await c.verifyAndCombine();

    await c.lockParameters(1, 50);
    const draw = await c.draw();
    expect(draw.value).toBeGreaterThanOrEqual(1);
    expect(draw.value).toBeLessThanOrEqual(50);
  });

  it('rejects invalid parameters', async () => {
    const c = new Ceremony();
    await expect(c.lockParameters(100, 1)).rejects.toThrow('min must be <= max');
    await expect(c.lockParameters(1.5, 10)).rejects.toThrow('integers');
  });

  it('rejects wrong-length remote seed', async () => {
    const c = new Ceremony();
    await c.generateLocalSeed();
    await expect(c.setRemoteSeed('aabb')).rejects.toThrow('32 bytes');
  });

  it('log chain verifies after full ceremony', async () => {
    const { verifyLogChain } = await import('../src/log');
    const c = new Ceremony();

    await c.lockParameters(1, 50);
    await c.generateLocalSeed();
    await c.setRemoteSeed('cc'.repeat(32));
    await c.receiveHumanInput('hello');
    await c.revealSeeds();
    await c.verifyAndCombine();
    await c.draw();

    const entries = JSON.parse(c.getLog().export());
    const invalidIdx = await verifyLogChain(entries);
    expect(invalidIdx).toBe(-1);
  });

  it('reset returns to INIT', async () => {
    const c = new Ceremony();
    await c.generateLocalSeed();
    c.reset();
    expect(c.getState().step).toBe('INIT');
    expect(c.getState().localSeed).toBeNull();
    expect(c.getState().parametersLocked).toBe(false);
  });

  it('unsubscribes log listeners', async () => {
    const c = new Ceremony();
    const events: string[] = [];
    const unsub = c.onLogEntry(e => events.push(e.event_type));

    await c.generateLocalSeed();
    expect(events.length).toBe(1);

    unsub();
    await c.setRemoteSeed('bb'.repeat(32));
    expect(events.length).toBe(1);
  });
});
