import { describe, expect, it } from 'vitest';
import { probe, type Device } from './compatibility';
import type { Release } from '@/lib/types';

const device: Device = { secure: true, wasm: true, threads: true, webgl2: true, opfs: true, locks: true, gamepad: true, touch: false, quota: 1024 * 1024 * 1024, usage: 0, userAgent: 'test' };
const nativeRelease = { recommended_core: { code: 'native-html', runtime_type: 'native', min_capabilities: [] } } as unknown as Release;
const pspRelease = { recommended_core: { code: 'ppsspp', runtime_type: 'wasm', min_capabilities: ['wasm', 'threads', 'webgl2'] } } as unknown as Release;

describe('capability classification', () => {
  it('never declares a generic device definitively compatible before a core run', () => {
    expect(probe(device, nativeRelease).status).toBe('limited');
  });

  it('blocks PSP without real cross-origin isolation threads', () => {
    expect(probe({ ...device, threads: false }, pspRelease)).toMatchObject({ status: 'unsupported' });
  });

  it('blocks downloads that cannot fit the reported quota', () => {
    expect(probe({ ...device, quota: 10 }, nativeRelease, 1024)).toMatchObject({ status: 'unsupported' });
  });

  it('keeps an unknown quota limited instead of inventing storage capacity', () => {
    expect(probe({ ...device, quota: undefined }, nativeRelease)).toMatchObject({ status: 'limited' });
  });
});
