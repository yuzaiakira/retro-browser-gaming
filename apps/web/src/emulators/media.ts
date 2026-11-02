import type { Asset, Manifest } from '@/lib/types';

/** Flat OPFS/catalog filenames only — no directories, absolute paths, or traversal. */
const safeFilename = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,119}$/;
const cueFile = /^\s*FILE\s+"([^"]+)"\s+(?:BINARY|MOTOROLA|WAVE)\s*$/gim;
const m3uLine = /^\s*([^#\r\n]+?)\s*$/;

export interface LaunchMedia {
  entry: File;
  companions: File[];
}

export interface GdiTrack {
  track: number;
  startLba: number;
  type: number;
  sectorSize: number;
  filename: string;
  offset: number;
}

function assertSafeFlatName(name: string, errorCode: string): string {
  const trimmed = name.trim();
  if (
    !trimmed ||
    trimmed !== name.trim() ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    trimmed.startsWith('.') ||
    !safeFilename.test(trimmed)
  ) {
    throw new Error(errorCode);
  }
  return trimmed;
}

/**
 * CUE paths are deliberately limited to the flat, importer-validated asset
 * namespace. EmulatorJS mounts companion files at `/filename`, so accepting
 * relative directories here would make a CUE refer to a file that the bundle
 * cannot safely provide.
 */
export function cueCompanionNames(cue: string): string[] {
  const names: string[] = [];
  for (const match of cue.matchAll(cueFile)) {
    const name = assertSafeFlatName(match[1], 'UNSAFE_CUE_COMPANION');
    if (names.includes(name)) throw new Error('DUPLICATE_CUE_COMPANION');
    names.push(name);
  }
  if (!names.length) throw new Error('CUE_HAS_NO_TRACKS');
  return names;
}

/**
 * Parse a Dreamcast GDI track manifest.
 *
 * Supports both common layouts:
 * - mkdcdisc: `N startLba type sectorSize filename offset`
 * - Redump/classic: `N ctrl adr startLba type filename offset` (sector size inferred)
 */
export function parseGdiManifest(text: string): GdiTrack[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length < 2) throw new Error('GDI_EMPTY');

  const declared = Number(lines[0]);
  if (!Number.isInteger(declared) || declared < 1 || declared > 99) {
    throw new Error('GDI_BAD_TRACK_COUNT');
  }
  if (lines.length - 1 !== declared) throw new Error('GDI_TRACK_COUNT_MISMATCH');

  const tracks: GdiTrack[] = [];
  const seenNames = new Set<string>();
  const seenTrackNos = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    // Prefer quoted filenames so spaces are allowed.
    const quoted = raw.match(
      /^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+"([^"]+)"\s+(\d+)\s*$/,
    );
    const quotedClassic = raw.match(
      /^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+"([^"]+)"\s+(\d+)\s*$/,
    );
    let track: number;
    let startLba: number;
    let type: number;
    let sectorSize: number;
    let filename: string;
    let offset: number;

    if (quotedClassic) {
      // N ctrl adr startLba type "file" offset — sector inferred from type
      track = Number(quotedClassic[1]);
      startLba = Number(quotedClassic[4]);
      type = Number(quotedClassic[5]);
      filename = quotedClassic[6];
      offset = Number(quotedClassic[7]);
      sectorSize = type === 0 ? 2352 : 2352;
    } else if (quoted) {
      track = Number(quoted[1]);
      startLba = Number(quoted[2]);
      type = Number(quoted[3]);
      sectorSize = Number(quoted[4]);
      filename = quoted[5];
      offset = Number(quoted[6]);
    } else {
      const parts = raw.match(/^(?:\S+\s+){4,6}\S+$/) ? raw.split(/\s+/) : null;
      if (!parts || parts.length < 6 || parts.length > 7) {
        throw new Error('GDI_BAD_TRACK_LINE');
      }
      if (parts.length === 6) {
        // N startLba type sectorSize filename offset
        track = Number(parts[0]);
        startLba = Number(parts[1]);
        type = Number(parts[2]);
        sectorSize = Number(parts[3]);
        filename = parts[4];
        offset = Number(parts[5]);
      } else {
        // N ctrl adr startLba type filename offset
        track = Number(parts[0]);
        startLba = Number(parts[3]);
        type = Number(parts[4]);
        filename = parts[5];
        offset = Number(parts[6]);
        sectorSize = 2352;
      }
    }

    if (![track, startLba, type, sectorSize, offset].every((n) => Number.isFinite(n) && n >= 0)) {
      throw new Error('GDI_BAD_NUMERIC_FIELD');
    }
    if (!Number.isInteger(track) || track < 1 || track > 99) throw new Error('GDI_BAD_TRACK_NUMBER');
    if (seenTrackNos.has(track)) throw new Error('GDI_DUPLICATE_TRACK_NUMBER');
    seenTrackNos.add(track);
    if (![0, 4].includes(type)) throw new Error('GDI_BAD_TRACK_TYPE');
    if (![2048, 2336, 2352].includes(sectorSize)) throw new Error('GDI_BAD_SECTOR_SIZE');
    if (!Number.isSafeInteger(startLba) || !Number.isSafeInteger(offset)) {
      throw new Error('GDI_OFFSET_OVERFLOW');
    }

    const safe = assertSafeFlatName(filename, 'UNSAFE_GDI_COMPANION');
    if (seenNames.has(safe.toLowerCase())) throw new Error('DUPLICATE_GDI_COMPANION');
    seenNames.add(safe.toLowerCase());

    tracks.push({ track, startLba, type, sectorSize, filename: safe, offset });
  }

  // Preserve original ordering; require strictly increasing start LBA.
  for (let i = 1; i < tracks.length; i++) {
    if (tracks[i].startLba < tracks[i - 1].startLba) {
      throw new Error('GDI_TRACK_ORDER');
    }
  }
  return tracks;
}

export function gdiCompanionNames(gdi: string): string[] {
  return parseGdiManifest(gdi).map((track) => track.filename);
}

/** M3U disc playlists — flat filenames only; comments and blanks ignored. */
export function m3uCompanionNames(m3u: string): string[] {
  const names: string[] = [];
  for (const line of m3u.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(m3uLine);
    if (!match) throw new Error('UNSAFE_M3U_ENTRY');
    const name = assertSafeFlatName(match[1], 'UNSAFE_M3U_ENTRY');
    if (names.includes(name)) throw new Error('DUPLICATE_M3U_ENTRY');
    names.push(name);
  }
  if (!names.length) throw new Error('M3U_EMPTY');
  return names;
}

function playableAsset(manifest: Manifest, filename: string): Asset {
  const asset = manifest.assets.find((item) => item.filename === filename);
  if (!asset || asset.role === 'bios') throw new Error('MISSING_REQUIRED_MEDIA');
  return asset;
}

async function namedFile(asset: Asset, read: (asset: Asset) => Promise<File>): Promise<File> {
  const stored = await read(asset);
  // OPFS stores every asset as content.bin; the core must receive the
  // immutable manifest filename so disc references resolve correctly.
  return new File([stored], asset.filename, { type: stored.type });
}

async function loadCompanions(
  manifest: Manifest,
  names: string[],
  read: (asset: Asset) => Promise<File>,
  undeclaredCode: string,
): Promise<File[]> {
  return Promise.all(
    names.map(async (name) => {
      const asset = playableAsset(manifest, name);
      if (!manifest.requiredFiles.includes(name)) throw new Error(undeclaredCode);
      const file = await namedFile(asset, read);
      return file;
    }),
  );
}

export async function loadLaunchMedia(
  manifest: Manifest,
  read: (asset: Asset) => Promise<File>,
): Promise<LaunchMedia> {
  const entryAsset = playableAsset(manifest, manifest.entryFile);
  const entry = await namedFile(entryAsset, read);
  const lower = entryAsset.filename.toLowerCase();

  if (lower.endsWith('.cue')) {
    const references = cueCompanionNames(await entry.text());
    return {
      entry,
      companions: await loadCompanions(manifest, references, read, 'UNDECLARED_CUE_COMPANION'),
    };
  }

  if (lower.endsWith('.gdi')) {
    const tracks = parseGdiManifest(await entry.text());
    const companions = await loadCompanions(
      manifest,
      tracks.map((t) => t.filename),
      read,
      'UNDECLARED_GDI_COMPANION',
    );
    // Validate declared sector sizes against companion byte lengths when known.
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const file = companions[i];
      if (track.offset > file.size) throw new Error('GDI_TRACK_OFFSET_PAST_EOF');
      if (file.size > 0 && file.size % track.sectorSize !== 0) {
        // Soft: some truncated homebrew GDIs pad unevenly; reject only when
        // the remainder is impossible for a single incomplete sector header.
        if (file.size < track.sectorSize && track.type === 4) {
          throw new Error('GDI_TRACK_TOO_SMALL');
        }
      }
    }
    return { entry, companions };
  }

  if (lower.endsWith('.m3u')) {
    const references = m3uCompanionNames(await entry.text());
    return {
      entry,
      companions: await loadCompanions(manifest, references, read, 'UNDECLARED_M3U_ENTRY'),
    };
  }

  // Single-file CDI / CHD / ISO / ELF — no companions.
  // Note: pinned Flycast WASM soft-stubs chdstream_*; CHD gameplay is blocked
  // at the core layer (see docs/emulator-builds/flycast-media-formats.md).
  return { entry, companions: [] };
}
