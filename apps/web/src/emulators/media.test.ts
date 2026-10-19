import { describe, expect, it } from 'vitest';
import { cueCompanionNames, loadLaunchMedia } from './media';
import type { Asset, Manifest } from '@/lib/types';

const asset = (filename: string, role = 'disk'): Asset => ({ id: crypto.randomUUID(), role, filename, url: '/fixture', byteSize: 1, sha256: 'a'.repeat(64), version: 'test', rangeSupported: true });
const cue = 'FILE "track01.bin" BINARY\n  TRACK 01 MODE1/2352\nFILE "track02.bin" BINARY\n  TRACK 02 AUDIO\n';
const manifest = (): Manifest => ({ manifestVersion: 1, releaseId: crypto.randomUUID(), revision: 'test', core: { code: 'pcsx_rearmed', version: 'test' }, assets: [asset('homebrew.cue'), asset('track01.bin'), asset('track02.bin')], requiredFiles: ['homebrew.cue', 'track01.bin', 'track02.bin'], entryFile: 'homebrew.cue', offlineRequirements: [], requiredCapabilities: [] });

describe('PS1 CUE companion media', () => {
  it('maps every referenced multi-track CUE file by its safe flat filename', async () => {
    const result = await loadLaunchMedia(manifest(), async (item) => new File([item.filename.endsWith('.cue') ? cue : item.filename], 'content.bin'));
    expect(result.entry.name).toBe('homebrew.cue');
    expect(result.companions.map((file) => file.name)).toEqual(['track01.bin', 'track02.bin']);
  });

  it('rejects path traversal, duplicate and missing track references before the core starts', async () => {
    expect(() => cueCompanionNames('FILE "../bios.bin" BINARY')).toThrow('UNSAFE_CUE_COMPANION');
    expect(() => cueCompanionNames('FILE "track.bin" BINARY\nFILE "track.bin" BINARY')).toThrow('DUPLICATE_CUE_COMPANION');
    const broken = manifest();
    await expect(loadLaunchMedia(broken, async (item) => new File([item.filename.endsWith('.cue') ? 'FILE "missing.bin" BINARY' : 'data'], item.filename))).rejects.toThrow('MISSING_REQUIRED_MEDIA');
  });
});
