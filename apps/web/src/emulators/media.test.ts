import { describe, expect, it } from 'vitest';
import {
  cueCompanionNames,
  gdiCompanionNames,
  loadLaunchMedia,
  m3uCompanionNames,
  parseGdiManifest,
} from './media';
import type { Asset, Manifest } from '@/lib/types';

const asset = (filename: string, role = 'disk', byteSize = 1): Asset => ({
  id: crypto.randomUUID(),
  role,
  filename,
  url: '/fixture',
  byteSize,
  sha256: 'a'.repeat(64),
  version: 'test',
  rangeSupported: true,
});

const cue =
  'FILE "track01.bin" BINARY\n  TRACK 01 MODE1/2352\nFILE "track02.bin" BINARY\n  TRACK 02 AUDIO\n';

const manifest = (entry: string, files: string[], core = 'pcsx_rearmed'): Manifest => ({
  manifestVersion: 1,
  releaseId: crypto.randomUUID(),
  revision: 'test',
  core: { code: core, version: 'test' },
  assets: files.map((name) => asset(name, 'disk', name.endsWith('.bin') || name.endsWith('.raw') ? 2352 : 1)),
  requiredFiles: files,
  entryFile: entry,
  offlineRequirements: [],
  requiredCapabilities: [],
});

describe('PS1 CUE companion media', () => {
  it('maps every referenced multi-track CUE file by its safe flat filename', async () => {
    const result = await loadLaunchMedia(
      manifest('homebrew.cue', ['homebrew.cue', 'track01.bin', 'track02.bin']),
      async (item) => new File([item.filename.endsWith('.cue') ? cue : item.filename], 'content.bin'),
    );
    expect(result.entry.name).toBe('homebrew.cue');
    expect(result.companions.map((file) => file.name)).toEqual(['track01.bin', 'track02.bin']);
  });

  it('rejects path traversal, duplicate and missing track references before the core starts', async () => {
    expect(() => cueCompanionNames('FILE "../bios.bin" BINARY')).toThrow('UNSAFE_CUE_COMPANION');
    expect(() => cueCompanionNames('FILE "track.bin" BINARY\nFILE "track.bin" BINARY')).toThrow(
      'DUPLICATE_CUE_COMPANION',
    );
    const broken = manifest('homebrew.cue', ['homebrew.cue', 'track01.bin']);
    await expect(
      loadLaunchMedia(broken, async (item) =>
        new File([item.filename.endsWith('.cue') ? 'FILE "missing.bin" BINARY' : 'data'], item.filename),
      ),
    ).rejects.toThrow('MISSING_REQUIRED_MEDIA');
  });
});

describe('Dreamcast GDI companion media', () => {
  const mkdcdiscGdi = `3
1 0 4 2352 track01.bin 0
2 600 0 2352 track02.raw 0
3 45000 4 2352 track03.bin 0
`;

  const spacedGdi = `2
1 0 4 2352 "track 01 data.bin" 0
2 45000 4 2352 "track 03 data.bin" 0
`;

  it('parses mkdcdisc GDI layout and preserves track order', () => {
    const tracks = parseGdiManifest(mkdcdiscGdi);
    expect(tracks.map((t) => t.filename)).toEqual(['track01.bin', 'track02.raw', 'track03.bin']);
    expect(tracks.map((t) => t.startLba)).toEqual([0, 600, 45000]);
    expect(tracks.every((t) => t.sectorSize === 2352)).toBe(true);
  });

  it('supports filenames containing spaces when quoted', () => {
    expect(gdiCompanionNames(spacedGdi)).toEqual(['track 01 data.bin', 'track 03 data.bin']);
  });

  it('rejects traversal, duplicates, absolute paths, and bad sector sizes', () => {
    expect(() => gdiCompanionNames('1\n1 0 4 2352 ../x.bin 0')).toThrow('UNSAFE_GDI_COMPANION');
    expect(() => gdiCompanionNames('1\n1 0 4 2352 /etc/passwd 0')).toThrow('UNSAFE_GDI_COMPANION');
    expect(() =>
      gdiCompanionNames('2\n1 0 4 2352 a.bin 0\n2 10 4 2352 a.bin 0'),
    ).toThrow('DUPLICATE_GDI_COMPANION');
    expect(() => gdiCompanionNames('1\n1 0 4 1234 a.bin 0')).toThrow('GDI_BAD_SECTOR_SIZE');
    expect(() =>
      gdiCompanionNames('2\n1 0 4 2352 a.bin 0\n2 10 4 2352 b.bin 0\n3 20 4 2352 c.bin 0'),
    ).toThrow('GDI_TRACK_COUNT_MISMATCH');
  });

  it('loads GDI companions from the immutable requiredFiles set', async () => {
    const result = await loadLaunchMedia(
      manifest(
        'mit-dreamcast-dot.gdi',
        ['mit-dreamcast-dot.gdi', 'track01.bin', 'track02.raw', 'track03.bin'],
        'flycast',
      ),
      async (item) =>
        new File(
          [item.filename.endsWith('.gdi') ? mkdcdiscGdi : new Uint8Array(2352)],
          'content.bin',
        ),
    );
    expect(result.companions.map((f) => f.name)).toEqual([
      'track01.bin',
      'track02.raw',
      'track03.bin',
    ]);
  });
});

describe('M3U multi-disc playlists', () => {
  it('maps flat disc entries and rejects traversal', () => {
    expect(m3uCompanionNames('# playlist\ndisc1.cdi\ndisc2.gdi\n')).toEqual([
      'disc1.cdi',
      'disc2.gdi',
    ]);
    expect(m3uCompanionNames('/disc1.chd\n/disc2.chd\n')).toEqual([
      'disc1.chd',
      'disc2.chd',
    ]);
    expect(() => m3uCompanionNames('../secret.cdi')).toThrow('UNSAFE_M3U_ENTRY');
    expect(() => m3uCompanionNames('/subdir/disc.cdi')).toThrow('UNSAFE_M3U_ENTRY');
    expect(() => m3uCompanionNames('a.cdi\na.cdi')).toThrow('DUPLICATE_M3U_ENTRY');
  });
});
