/**
 * Safe RMS migration: launcher-origin IndexedDB ↔ dedicated J2ME origin.
 * Never silently overwrite newer saves with stale data. Source retained until
 * an explicit, validated merge decision succeeds.
 */

const DB_NAME = 'retro-j2me-rms';
const STORE = 'midlets';
const META_DB = 'retro-j2me-migrate-meta';
const META_STORE = 'migrations';

export type RmsSnapshot = {
  stores: Record<string, { records?: Record<string, number[] | Uint8Array> }>;
  meta?: {
    updatedAt?: number;
    revision?: number;
    fingerprint?: string;
    origin?: string;
  };
};

export type SuiteMigration = {
  midletId: string;
  snapshot: RmsSnapshot;
  byteSize: number;
};

export type MergeDecision =
  | 'import-source'
  | 'keep-target'
  | 'equal'
  | 'conflict-keep-target';

const CONFLICT_DB = 'retro-j2me-rms-conflicts';
const CONFLICT_STORE = 'conflicts';

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

/** Stable fingerprint of RMS record bytes (ignores meta). */
export function fingerprintSnapshot(snapshot: RmsSnapshot | null | undefined): string {
  if (!snapshot?.stores) return 'empty';
  const parts: string[] = [];
  for (const name of Object.keys(snapshot.stores).sort()) {
    const records = snapshot.stores[name]?.records || {};
    for (const key of Object.keys(records).sort()) {
      const rec = records[key];
      const bytes = Array.isArray(rec)
        ? rec
        : rec instanceof Uint8Array
          ? [...rec]
          : [];
      parts.push(`${name}#${key}=${bytes.join(',')}`);
    }
  }
  return parts.join('|') || 'empty';
}

export function snapshotUpdatedAt(snapshot: RmsSnapshot | null | undefined): number {
  const at = snapshot?.meta?.updatedAt;
  return typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : 0;
}

export function snapshotRevision(snapshot: RmsSnapshot | null | undefined): number {
  const rev = snapshot?.meta?.revision;
  return typeof rev === 'number' && Number.isFinite(rev) && rev > 0 ? rev : 0;
}

/**
 * Decide whether source may replace target.
 * Prefer explicit timestamps/revisions; never replace a newer target with older source.
 * When both lack meta but content differs → conflict-keep-target (safe default).
 */
export function decideMergeAction(
  source: RmsSnapshot | null | undefined,
  target: RmsSnapshot | null | undefined,
): MergeDecision {
  if (!source?.stores) return 'keep-target';
  if (!target?.stores) return 'import-source';
  const srcFp = fingerprintSnapshot(source);
  const tgtFp = fingerprintSnapshot(target);
  if (srcFp === tgtFp) return 'equal';

  const srcAt = snapshotUpdatedAt(source);
  const tgtAt = snapshotUpdatedAt(target);
  if (srcAt > 0 || tgtAt > 0) {
    if (srcAt > tgtAt) return 'import-source';
    if (tgtAt > srcAt) return 'keep-target';
  }

  const srcRev = snapshotRevision(source);
  const tgtRev = snapshotRevision(target);
  if (srcRev > 0 || tgtRev > 0) {
    if (srcRev > tgtRev) return 'import-source';
    if (tgtRev > srcRev) return 'keep-target';
  }

  // Equal clocks / revisions with different bytes, or missing meta: keep target,
  // but callers must also preserve the source via preserveConflictSnapshot.
  return 'conflict-keep-target';
}

/** Persist a conflicting source snapshot so it is never silently discarded. */
export async function preserveConflictSnapshot(
  midletId: string,
  source: RmsSnapshot,
  target: RmsSnapshot | null | undefined,
  reason: string,
): Promise<string> {
  if (!isValidSuiteId(midletId)) throw new Error('J2ME_MIGRATE_BAD_ID');
  const key = `${midletId}::${fingerprintSnapshot(source)}::${Date.now()}`;
  const db = await openDb(CONFLICT_DB, 1, (database) => {
    if (!database.objectStoreNames.contains(CONFLICT_STORE)) {
      database.createObjectStore(CONFLICT_STORE);
    }
  });
  try {
    const tx = db.transaction(CONFLICT_STORE, 'readwrite');
    await idbReq(
      tx.objectStore(CONFLICT_STORE).put(
        {
          midletId,
          reason,
          at: Date.now(),
          source: structuredClone(source),
          target: target ? structuredClone(target) : null,
          sourceFingerprint: fingerprintSnapshot(source),
          targetFingerprint: fingerprintSnapshot(target),
        },
        key,
      ),
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  } finally {
    db.close();
  }
}

export function stampSnapshot(
  snapshot: RmsSnapshot,
  previous?: RmsSnapshot | null,
  origin?: string,
): RmsSnapshot {
  const prevRev = snapshotRevision(previous);
  return {
    stores: structuredClone(snapshot.stores),
    meta: {
      updatedAt: Date.now(),
      revision: prevRev + 1,
      fingerprint: fingerprintSnapshot(snapshot),
      origin: origin || previous?.meta?.origin,
    },
  };
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
  value: {
    status: string;
    at: number;
    byteSize: number;
    targetOrigin: string;
    decision?: string;
    fingerprint?: string;
  },
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
    preferNewer: true,
    suites: suites.map((s) => ({
      midletId: s.midletId,
      snapshot: s.snapshot,
    })),
  };
}

/**
 * Pure merge planner for rollback/forward tests.
 * Returns per-suite actions without touching storage.
 */
export function planSuiteMerges(
  sourceSuites: SuiteMigration[],
  targetSuites: SuiteMigration[],
): Array<{ midletId: string; decision: MergeDecision }> {
  const targetMap = new Map(targetSuites.map((s) => [s.midletId, s]));
  return sourceSuites.map((src) => ({
    midletId: src.midletId,
    decision: decideMergeAction(src.snapshot, targetMap.get(src.midletId)?.snapshot),
  }));
}

export type MergeResult = {
  midletId: string;
  decision: MergeDecision;
  conflictKey?: string;
  error?: string;
};

/** Write suites into launcher IDB using prefer-newer merge (rollback path). */
export async function mergeSuitesIntoLauncher(
  suites: SuiteMigration[],
  options?: { originLabel?: string },
): Promise<MergeResult[]> {
  if (suites.length > 16) throw new Error('J2ME_MIGRATE_TOO_MANY');
  const db = await openDb(DB_NAME, 1, (database) => {
    if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
  });
  const results: MergeResult[] = [];
  try {
    for (const suite of suites) {
      if (!isValidSuiteId(suite.midletId)) throw new Error('J2ME_MIGRATE_BAD_ID');
      const byteSize = estimateSnapshotBytes(suite.snapshot);
      if (byteSize <= 0 || byteSize > 256 * 1024) throw new Error('J2ME_MIGRATE_TOO_LARGE');

      try {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const existing = (await idbReq(store.get(suite.midletId))) as RmsSnapshot | undefined;
        const decision = decideMergeAction(suite.snapshot, existing);
        let conflictKey: string | undefined;
        if (decision === 'conflict-keep-target') {
          conflictKey = await preserveConflictSnapshot(
            suite.midletId,
            suite.snapshot,
            existing,
            'rollback-conflict',
          );
        }
        if (decision === 'import-source') {
          const stamped = stampSnapshot(
            suite.snapshot,
            existing,
            options?.originLabel || 'dedicated-rollback',
          );
          await idbReq(store.put(stamped, suite.midletId));
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error('IDB_TX_ABORTED'));
        });
        results.push({ midletId: suite.midletId, decision, conflictKey });
        await migrationMetaPut(suite.midletId, {
          status: decision === 'import-source' ? 'rollback-imported' : `rollback-${decision}`,
          at: Date.now(),
          byteSize,
          targetOrigin: 'launcher',
          decision,
          fingerprint: fingerprintSnapshot(suite.snapshot),
        });
      } catch (error) {
        const message = String((error as Error)?.name || (error as Error)?.message || error);
        // Quota / abort: leave existing target intact; preserve source as conflict.
        let conflictKey: string | undefined;
        try {
          conflictKey = await preserveConflictSnapshot(
            suite.midletId,
            suite.snapshot,
            null,
            `rollback-error:${message}`,
          );
        } catch {
          /* best-effort */
        }
        results.push({
          midletId: suite.midletId,
          decision: 'conflict-keep-target',
          conflictKey,
          error: message,
        });
      }
    }
    return results;
  } finally {
    db.close();
  }
}
