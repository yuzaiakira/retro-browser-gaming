/**
 * Safe RMS migration: launcher-origin IndexedDB → dedicated J2ME origin via postMessage.
 * Never grants the frame open access to launcher IDB. Source data retained until verified.
 */

const DB_NAME = 'retro-j2me-rms';
const STORE = 'midlets';
const META_DB = 'retro-j2me-migrate-meta';
const META_STORE = 'migrations';

export type RmsSnapshot = {
  stores: Record<string, { records?: Record<string, number[] | Uint8Array> }>;
};

export type SuiteMigration = {
  midletId: string;
  snapshot: RmsSnapshot;
  byteSize: number;
};

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IDB_REQUEST_FAILED'));
  });
}

function openDb(name: string, version: number, upgrade: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'));
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => resolve(req.result);
  });
}

/** Discover launcher-origin RMS suites (narrowly: only retro-j2me-rms / midlets). */
export async function discoverLauncherRmsSuites(): Promise<SuiteMigration[]> {
  const db = await openDb(DB_NAME, 1, (database) => {
    if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
  });
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const keys = (await idbReq(store.getAllKeys())) as IDBValidKey[];
    const suites: SuiteMigration[] = [];
    for (const key of keys) {
      const midletId = String(key);
      if (!isValidSuiteId(midletId)) continue;
      const snapshot = (await idbReq(store.get(key))) as RmsSnapshot | undefined;
      if (!snapshot?.stores || typeof snapshot.stores !== 'object') continue;
      const byteSize = estimateSnapshotBytes(snapshot);
      if (byteSize <= 0 || byteSize > 256 * 1024) continue;
      suites.push({ midletId, snapshot: structuredClone(snapshot), byteSize });
    }
    return suites;
  } finally {
    db.close();
  }
}

export function isValidSuiteId(id: string) {
  return /^[A-Za-z0-9 ._+/-]{3,160}$/.test(id) && !id.includes('..');
}

export function estimateSnapshotBytes(snapshot: RmsSnapshot) {
  let bytes = 0;
  for (const store of Object.values(snapshot.stores || {})) {
    for (const rec of Object.values(store.records || {})) {
      bytes += Array.isArray(rec) ? rec.length : (rec as Uint8Array)?.byteLength || 0;
    }
  }
  return bytes;
}

export async function migrationMetaGet(midletId: string) {
  const db = await openDb(META_DB, 1, (database) => {
    if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
  });
  try {
    return await idbReq(db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(midletId));
  } finally {
    db.close();
  }
}

export async function migrationMetaPut(
  midletId: string,
  value: { status: string; at: number; byteSize: number; targetOrigin: string },
) {
  const db = await openDb(META_DB, 1, (database) => {
    if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
  });
  try {
    const tx = db.transaction(META_STORE, 'readwrite');
    await idbReq(tx.objectStore(META_STORE).put(value, midletId));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function buildMigrationPayload(suites: SuiteMigration[], overwrite: boolean) {
  if (suites.length > 16) throw new Error('J2ME_MIGRATE_TOO_MANY');
  return {
    overwrite,
    suites: suites.map((s) => ({
      midletId: s.midletId,
      snapshot: s.snapshot,
    })),
  };
}
