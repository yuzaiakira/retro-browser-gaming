import type { Asset, Manifest } from '@/lib/types';

const safeFilename = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const cueFile = /^\s*FILE\s+"([^"]+)"\s+(?:BINARY|MOTOROLA|WAVE)\s*$/gim;

export interface LaunchMedia {
  entry: File;
  companions: File[];
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
    const name = match[1];
    if (!safeFilename.test(name) || name.includes('..'))
      throw new Error('UNSAFE_CUE_COMPANION');
    if (names.includes(name)) throw new Error('DUPLICATE_CUE_COMPANION');
    names.push(name);
  }
  if (!names.length) throw new Error('CUE_HAS_NO_TRACKS');
  return names;
}

function playableAsset(manifest: Manifest, filename: string): Asset {
  const asset = manifest.assets.find((item) => item.filename === filename);
  if (!asset || asset.role === 'bios') throw new Error('MISSING_REQUIRED_MEDIA');
  return asset;
}

export async function loadLaunchMedia(
  manifest: Manifest,
  read: (asset: Asset) => Promise<File>,
): Promise<LaunchMedia> {
  const entryAsset = playableAsset(manifest, manifest.entryFile);
  const named = async (asset: Asset) => {
    const stored = await read(asset);
    // OPFS stores every asset as content.bin; the core must receive the
    // immutable manifest filename so CUE references resolve correctly.
    return new File([stored], asset.filename, { type: stored.type });
  };
  const entry = await named(entryAsset);
  if (!entryAsset.filename.toLowerCase().endsWith('.cue')) return { entry, companions: [] };

  const references = cueCompanionNames(await entry.text());
  const companions = await Promise.all(
    references.map(async (name) => {
      const asset = playableAsset(manifest, name);
      if (!manifest.requiredFiles.includes(name)) throw new Error('UNDECLARED_CUE_COMPANION');
      return named(asset);
    }),
  );
  return { entry, companions };
}
