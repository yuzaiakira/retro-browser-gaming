/**
 * Arcade ROMset validation — immutable manifests, ZIP safety, bounded inflate.
 * See docs/emulator-builds/arcade-romset-policy.md
 */

export type RomsetMember = {
  filename: string;
  size: number;
  sha256: string;
  crc32?: string;
};

export type RomsetManifest = {
  driver: string;
  coreCode: string;
  coreVersion: string;
  coreSha256?: string;
  parents: string[];
  bios: string[];
  samples: string[];
  members: RomsetMember[];
  maxUncompressedBytes: number;
  maxMemberCount: number;
  /** When true, archive may only contain exact member set. */
  exactSet: boolean;
};

export type RomsetValidationOk = {
  ok: true;
  driver: string;
  members: RomsetMember[];
  uncompressedBytes: number;
};

export type RomsetValidationErr = {
  ok: false;
  code:
    | 'ROMSET_ZIP_TRAVERSAL'
    | 'ROMSET_DECOMPRESSION_LIMIT'
    | 'ROMSET_MISSING_MEMBER'
    | 'ROMSET_HASH_MISMATCH'
    | 'ROMSET_SIZE_MISMATCH'
    | 'ROMSET_UNEXPECTED_MEMBER'
    | 'ROMSET_PARENT_REQUIRED'
    | 'ROMSET_BIOS_REQUIRED'
    | 'ROMSET_CORE_DRIVER_MISMATCH'
    | 'ROMSET_MALFORMED_ZIP'
    | 'ROMSET_TOO_MANY_MEMBERS';
  message: string;
  detail?: Record<string, unknown>;
};

export type RomsetValidationResult = RomsetValidationOk | RomsetValidationErr;

const SAFE_ZIP_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

/** Engineering fixture for driver rbgdot (MIT identity ROM). */
export const RBGDOT_ROMSET: RomsetManifest = {
  driver: 'rbgdot',
  coreCode: 'mame_rbg_arcade',
  coreVersion: 'mame-rbgdot-dev',
  parents: [],
  bios: [],
  samples: [],
  members: [
    {
      filename: 'rbgdot.id',
      size: 256,
      sha256: '6357cc228a2504250c8c81df7792429122eefc2489303cb7be6ab126009896ab',
      crc32: '8fb91fe4',
    },
  ],
  maxUncompressedBytes: 64 * 1024,
  maxMemberCount: 8,
  exactSet: true,
};

function fail(
  code: RomsetValidationErr['code'],
  message: string,
  detail?: Record<string, unknown>,
): RomsetValidationErr {
  return { ok: false, code, message, detail };
}

export function assertSafeZipMemberName(name: string): RomsetValidationErr | null {
  if (!name || name.includes('..') || name.includes('\\') || name.startsWith('/') || name.includes('/')) {
    return fail('ROMSET_ZIP_TRAVERSAL', `Unsafe ZIP member path: ${name}`);
  }
  if (!SAFE_ZIP_NAME.test(name)) {
    return fail('ROMSET_ZIP_TRAVERSAL', `Illegal ZIP member name: ${name}`);
  }
  return null;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate a already-inflated member map against a manifest.
 * Callers must inflate with their own bounded ZIP reader (see validateRomsetZip).
 */
export async function validateRomsetMembers(
  manifest: RomsetManifest,
  files: Map<string, Uint8Array>,
  opts?: { coreCode?: string; driver?: string },
): Promise<RomsetValidationResult> {
  if (opts?.coreCode && opts.coreCode !== manifest.coreCode) {
    return fail('ROMSET_CORE_DRIVER_MISMATCH', 'Core code does not match ROMset manifest', {
      expected: manifest.coreCode,
      got: opts.coreCode,
    });
  }
  if (opts?.driver && opts.driver !== manifest.driver) {
    return fail('ROMSET_CORE_DRIVER_MISMATCH', 'Driver does not match ROMset manifest', {
      expected: manifest.driver,
      got: opts.driver,
    });
  }
  if (manifest.parents.length) {
    return fail('ROMSET_PARENT_REQUIRED', `Parent set required: ${manifest.parents.join(',')}`);
  }
  if (manifest.bios.length) {
    return fail('ROMSET_BIOS_REQUIRED', `BIOS set required: ${manifest.bios.join(',')}`);
  }
  if (files.size > manifest.maxMemberCount) {
    return fail('ROMSET_TOO_MANY_MEMBERS', `Too many ZIP members (${files.size})`);
  }

  let uncompressed = 0;
  for (const buf of files.values()) uncompressed += buf.byteLength;
  if (uncompressed > manifest.maxUncompressedBytes) {
    return fail('ROMSET_DECOMPRESSION_LIMIT', `Uncompressed size ${uncompressed} exceeds cap`);
  }

  if (manifest.exactSet) {
    for (const name of files.keys()) {
      if (!manifest.members.some((m) => m.filename === name)) {
        return fail('ROMSET_UNEXPECTED_MEMBER', `Unexpected member: ${name}`);
      }
    }
  }

  for (const member of manifest.members) {
    const buf = files.get(member.filename);
    if (!buf) {
      return fail('ROMSET_MISSING_MEMBER', `Missing member: ${member.filename}`, {
        filename: member.filename,
      });
    }
    if (buf.byteLength !== member.size) {
      return fail('ROMSET_SIZE_MISMATCH', `Size mismatch: ${member.filename}`, {
        expected: member.size,
        got: buf.byteLength,
      });
    }
    const hash = await sha256Hex(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    if (hash !== member.sha256) {
      return fail('ROMSET_HASH_MISMATCH', `Hash mismatch: ${member.filename}`, {
        expected: member.sha256,
        got: hash,
      });
    }
  }

  return {
    ok: true,
    driver: manifest.driver,
    members: manifest.members,
    uncompressedBytes: uncompressed,
  };
}

/**
 * Minimal ZIP local-file parser (store + deflate) with bomb / traversal guards.
 * Avoids loading a full third-party unzip for the engineering path.
 */
export async function validateRomsetZip(
  manifest: RomsetManifest,
  zipBytes: ArrayBuffer,
  opts?: { coreCode?: string; driver?: string },
): Promise<RomsetValidationResult> {
  const u8 = new Uint8Array(zipBytes);
  const view = new DataView(zipBytes);
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  let totalUncompressed = 0;

  try {
    while (offset + 30 <= u8.byteLength) {
      const sig = view.getUint32(offset, true);
      if (sig === 0x02014b50 || sig === 0x06054b50) break; // central dir / EOCD
      if (sig !== 0x04034b50) {
        return fail('ROMSET_MALFORMED_ZIP', `Bad local header signature at ${offset}`);
      }
      const method = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const uncompSize = view.getUint32(offset + 22, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const nameEnd = nameStart + nameLen;
      if (nameEnd + extraLen + compSize > u8.byteLength) {
        return fail('ROMSET_MALFORMED_ZIP', 'Truncated ZIP member');
      }
      const name = new TextDecoder('utf-8').decode(u8.subarray(nameStart, nameEnd));
      const unsafe = assertSafeZipMemberName(name);
      if (unsafe) return unsafe;

      totalUncompressed += uncompSize;
      if (totalUncompressed > manifest.maxUncompressedBytes || files.size + 1 > manifest.maxMemberCount) {
        return fail('ROMSET_DECOMPRESSION_LIMIT', 'Decompression / member cap exceeded');
      }

      const dataStart = nameEnd + extraLen;
      const compressed = u8.subarray(dataStart, dataStart + compSize);
      let raw: Uint8Array;
      if (method === 0) {
        raw = compressed.slice();
      } else if (method === 8) {
        raw = new Uint8Array(await inflateRaw(compressed, uncompSize, manifest.maxUncompressedBytes));
      } else {
        return fail('ROMSET_MALFORMED_ZIP', `Unsupported compression method ${method}`);
      }
      if (raw.byteLength !== uncompSize) {
        return fail('ROMSET_MALFORMED_ZIP', `Inflate size mismatch for ${name}`);
      }
      files.set(name, raw);
      offset = dataStart + compSize;
    }
  } catch (e) {
    return fail('ROMSET_MALFORMED_ZIP', String(e instanceof Error ? e.message : e));
  }

  return validateRomsetMembers(manifest, files, opts);
}

async function inflateRaw(
  compressed: Uint8Array,
  expected: number,
  cap: number,
): Promise<ArrayBuffer> {
  if (expected > cap) throw new Error('ROMSET_DECOMPRESSION_LIMIT');
  // DecompressionStream expects zlib/gzip wrappers; for raw deflate use ds + ignore... 
  // Prefer built-in: wrap as raw via Compression Streams if available with 'deflate-raw'.
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([compressed]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  if (ab.byteLength > cap) throw new Error('ROMSET_DECOMPRESSION_LIMIT');
  return ab;
}
