import { describe, expect, it } from 'vitest';
import {
  decideMergeAction,
  fingerprintSnapshot,
  planSuiteMerges,
  stampSnapshot,
  type RmsSnapshot,
  type SuiteMigration,
} from './j2me-rms-migrate';

function snap(bytes: number[], meta?: RmsSnapshot['meta']): RmsSnapshot {
  return {
    stores: { score: { records: { '1': bytes } } },
    meta,
  };
}

describe('RMS prefer-newer merge', () => {
  it('imports when target is empty', () => {
    expect(decideMergeAction(snap([1, 2, 3]), null)).toBe('import-source');
  });

  it('keeps equal fingerprints', () => {
    const a = snap([9], { updatedAt: 100, revision: 1 });
    const b = snap([9], { updatedAt: 50, revision: 1 });
    expect(fingerprintSnapshot(a)).toBe(fingerprintSnapshot(b));
    expect(decideMergeAction(a, b)).toBe('equal');
  });

  it('never overwrites newer dedicated target with older launcher source', () => {
    const launcherStale = snap([1], { updatedAt: 1_000, revision: 1 });
    const dedicatedNewer = snap([9], { updatedAt: 5_000, revision: 4 });
    expect(decideMergeAction(launcherStale, dedicatedNewer)).toBe('keep-target');
  });

  it('imports newer dedicated export over stale launcher during rollback', () => {
    const dedicated = snap([7, 7], { updatedAt: 9_000, revision: 5 });
    const launcherOld = snap([1], { updatedAt: 100, revision: 1 });
    expect(decideMergeAction(dedicated, launcherOld)).toBe('import-source');
  });

  it('keeps newer launcher when dedicated export is older', () => {
    const dedicatedOld = snap([2], { updatedAt: 100, revision: 1 });
    const launcherNew = snap([8], { updatedAt: 9_000, revision: 3 });
    expect(decideMergeAction(dedicatedOld, launcherNew)).toBe('keep-target');
  });

  it('conflict-keeps target when content differs without trustworthy clocks', () => {
    const a = snap([1]);
    const b = snap([2]);
    expect(decideMergeAction(a, b)).toBe('conflict-keep-target');
  });

  it('conflict-keeps target when timestamps and revisions are equal but bytes differ', () => {
    const a = snap([1], { updatedAt: 5000, revision: 3 });
    const b = snap([9], { updatedAt: 5000, revision: 3 });
    expect(decideMergeAction(a, b)).toBe('conflict-keep-target');
  });

  it('plans rollback merges for deliberately different versions', () => {
    const source: SuiteMigration[] = [
      {
        midletId: 'Retro Browser Gaming/MIT J2ME Dot/1.0.0',
        snapshot: snap([0, 0, 0, 9], { updatedAt: 8000, revision: 3 }),
        byteSize: 4,
      },
      {
        midletId: 'Retro Browser Gaming/MIT J2ME Paddle/1.0.0',
        snapshot: snap([0, 0, 0, 1], { updatedAt: 100, revision: 1 }),
        byteSize: 4,
      },
    ];
    const target: SuiteMigration[] = [
      {
        midletId: 'Retro Browser Gaming/MIT J2ME Dot/1.0.0',
        snapshot: snap([0, 0, 0, 2], { updatedAt: 100, revision: 1 }),
        byteSize: 4,
      },
      {
        midletId: 'Retro Browser Gaming/MIT J2ME Paddle/1.0.0',
        snapshot: snap([0, 0, 0, 5], { updatedAt: 9000, revision: 4 }),
        byteSize: 4,
      },
    ];
    const plan = planSuiteMerges(source, target);
    expect(plan).toEqual([
      { midletId: source[0].midletId, decision: 'import-source' },
      { midletId: source[1].midletId, decision: 'keep-target' },
    ]);
  });

  it('stampSnapshot increments revision and sets fingerprint', () => {
    const prev = snap([1], { updatedAt: 1, revision: 2, fingerprint: 'x' });
    const next = stampSnapshot(snap([2]), prev, 'test');
    expect(next.meta?.revision).toBe(3);
    expect(next.meta?.fingerprint).toBe(fingerprintSnapshot(snap([2])));
    expect(next.meta?.origin).toBe('test');
  });
});
