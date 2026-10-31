/**
 * User-provided BIOS / firmware slots.
 *
 * Proprietary firmware is never fetched or redistributed by the launcher.
 * Operators import files they are authorized to use; hashes verify identity only.
 * Reused later for Famicom Disk System and Sega CD / Mega-CD.
 */

export type UserBiosSlot = {
  id: string;
  /** EmulatorJS / libretro cores that accept this slot. */
  cores: string[];
  /** Console / platform id for UI copy. */
  platform: string;
  /** Preferred filename presented to EmulatorJS (EJS_biosUrl / system file). */
  preferredFilename: string;
  /** Alternate names accepted on import. */
  acceptedFilenames: string[];
  minBytes: number;
  maxBytes: number;
  /** When non-empty, imported bytes must match one of these SHA-256 digests. */
  acceptedSha256: string[];
  notes: string;
  /**
   * When false, slot is documented for reuse (FDS / Sega CD) but does not gate
   * cartridge/HLE cores that share the same EmulatorJS core id.
   */
  enabled: boolean;
};

export const USER_BIOS_SLOTS: UserBiosSlot[] = [
  {
    id: "colecovision",
    cores: ["gearcoleco"],
    platform: "colecovision",
    preferredFilename: "colecovision.rom",
    acceptedFilenames: ["colecovision.rom", "coleco.rom", "COLECO.ROM", "ColecoVision.rom"],
    minBytes: 8192,
    maxBytes: 8192,
    // No authoritative redistributable dump is published here. Size gates format;
    // operators may add known personal dump hashes locally if desired.
    acceptedSha256: [],
    enabled: true,
    notes:
      "ColecoVision / ADAM OS-7 BIOS (proprietary). Provide only firmware you are authorized to use. Never published via anonymous routes.",
  },
  {
    id: "fds",
    cores: ["fceumm", "nestopia"],
    platform: "fds",
    preferredFilename: "disksys.rom",
    acceptedFilenames: ["disksys.rom", "DISKSYS.ROM"],
    minBytes: 8192,
    maxBytes: 8192,
    // OpenDiskSysROM LGPL-3.0 (b3cbc00d… / asm6f fd03633…) is a lawful
    // size-compatible candidate. Do not require Nintendo BIOS hashes.
    acceptedSha256: [
      "6ce74ea4e9407c8d1175a58b7af08f073fa6b9f9b54e4f4954828ae1b6872ba6",
    ],
    enabled: false,
    notes:
      "Famicom Disk System BIOS slot. Catalog remains disabled. OpenDiskSysROM (LGPL-3.0) verified mountable under FCEUmm; Nintendo disksys.rom must never be redistributed.",
  },
  {
    id: "sega-cd",
    cores: ["genesis_plus_gx"],
    platform: "sega-cd",
    preferredFilename: "bios_CD_U.bin",
    acceptedFilenames: [
      "bios_CD_U.bin",
      "bios_CD_E.bin",
      "bios_CD_J.bin",
      "sega_cd_bios.bin",
    ],
    minBytes: 128 * 1024,
    maxBytes: 512 * 1024,
    acceptedSha256: [],
    enabled: false,
    notes:
      "Sega CD / Mega-CD BIOS (proprietary, region-specific). Slot reserved for PH-12.2; not playable until verified.",
  },
];

export type UserBiosValidationOk = {
  ok: true;
  slot: UserBiosSlot;
  sha256: string;
  byteSize: number;
  filename: string;
};

export type UserBiosValidationErr = {
  ok: false;
  code:
    | "UNKNOWN_SLOT"
    | "UNSUPPORTED_CORE"
    | "BAD_FILENAME"
    | "BAD_SIZE"
    | "HASH_MISMATCH"
    | "EMPTY_FILE";
  message: string;
};

export type UserBiosValidation = UserBiosValidationOk | UserBiosValidationErr;

export function slotById(id: string): UserBiosSlot | undefined {
  return USER_BIOS_SLOTS.find((s) => s.id === id);
}

export function slotsForCore(core: string): UserBiosSlot[] {
  return USER_BIOS_SLOTS.filter((s) => s.enabled && s.cores.includes(core));
}

export function coreRequiresUserBios(core: string): boolean {
  return slotsForCore(core).length > 0;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateUserBiosFile(
  slotId: string,
  file: File,
  options?: { core?: string },
): Promise<UserBiosValidation> {
  const slot = slotById(slotId);
  if (!slot) {
    return {
      ok: false,
      code: "UNKNOWN_SLOT",
      message: `Unknown BIOS slot "${slotId}".`,
    };
  }
  if (options?.core && !slot.cores.includes(options.core)) {
    return {
      ok: false,
      code: "UNSUPPORTED_CORE",
      message: `BIOS slot "${slotId}" is not compatible with core "${options.core}".`,
    };
  }
  const name = file.name || "";
  const base = name.split(/[/\\]/).pop() || name;
  if (
    base &&
    !slot.acceptedFilenames.some((n) => n.toLowerCase() === base.toLowerCase())
  ) {
    return {
      ok: false,
      code: "BAD_FILENAME",
      message: `Unexpected filename "${base}". Expected one of: ${slot.acceptedFilenames.join(", ")}.`,
    };
  }
  if (!file.size) {
    return { ok: false, code: "EMPTY_FILE", message: "BIOS file is empty." };
  }
  if (file.size < slot.minBytes || file.size > slot.maxBytes) {
    return {
      ok: false,
      code: "BAD_SIZE",
      message: `BIOS size ${file.size} is outside ${slot.minBytes}–${slot.maxBytes} bytes for ${slot.id}.`,
    };
  }
  const buf = await file.arrayBuffer();
  const digest = await sha256Hex(buf);
  if (slot.acceptedSha256.length && !slot.acceptedSha256.includes(digest)) {
    return {
      ok: false,
      code: "HASH_MISMATCH",
      message: `BIOS SHA-256 ${digest} does not match a known dump for ${slot.id}. Identity check failed (not a rights proof).`,
    };
  }
  return {
    ok: true,
    slot,
    sha256: digest,
    byteSize: file.size,
    filename: slot.preferredFilename,
  };
}

const DB_NAME = "rbg-user-bios";
const DB_VERSION = 1;
const STORE = "bios";

export type StoredUserBios = {
  slotId: string;
  filename: string;
  sha256: string;
  byteSize: number;
  blob: Blob;
  importedAt: number;
  coreHint?: string;
};

function openBiosDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("USER_BIOS_IDB_OPEN"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "slotId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("USER_BIOS_IDB_REQ"));
  });
}

/** Persist a validated BIOS blob in IndexedDB (local-only; never uploaded). */
export async function importUserBios(
  slotId: string,
  file: File,
  options?: { core?: string },
): Promise<StoredUserBios> {
  const result = await validateUserBiosFile(slotId, file, options);
  if (!result.ok) {
    throw new Error(`USER_BIOS_${result.code}: ${result.message}`);
  }
  const record: StoredUserBios = {
    slotId,
    filename: result.filename,
    sha256: result.sha256,
    byteSize: result.byteSize,
    blob: file.slice(0, file.size, file.type || "application/octet-stream"),
    importedAt: Date.now(),
    coreHint: options?.core,
  };
  const db = await openBiosDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put(record));
  } finally {
    db.close();
  }
  return record;
}

export async function getUserBios(slotId: string): Promise<StoredUserBios | null> {
  const db = await openBiosDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await idbReq(tx.objectStore(STORE).get(slotId));
    return (row as StoredUserBios) || null;
  } finally {
    db.close();
  }
}

export async function deleteUserBios(slotId: string): Promise<void> {
  const db = await openBiosDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(slotId));
  } finally {
    db.close();
  }
}

export async function listUserBios(): Promise<StoredUserBios[]> {
  const db = await openBiosDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const rows = await idbReq(tx.objectStore(STORE).getAll());
    return (rows as StoredUserBios[]) || [];
  } finally {
    db.close();
  }
}

/**
 * Resolve BIOS File for FrameAdapter, or throw MISSING_USER_BIOS.
 * Does not download firmware.
 */
export async function resolveUserBiosFileForCore(core: string): Promise<File | undefined> {
  const slots = slotsForCore(core);
  if (!slots.length) return undefined;
  // Single primary slot per core for now (coleco / fds / sega-cd).
  const slot = slots[0];
  const stored = await getUserBios(slot.id);
  if (!stored) {
    throw new Error(
      `MISSING_USER_BIOS:${slot.id} — import authorized ${slot.preferredFilename} in Settings (never auto-downloaded).`,
    );
  }
  return new File([stored.blob], stored.filename, {
    type: stored.blob.type || "application/octet-stream",
  });
}
