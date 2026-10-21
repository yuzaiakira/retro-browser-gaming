/**
 * Browser IndexedDB persistence backend for the isolated RecordStore PoC.
 * Same snapshot shape as MemoryPersistence (midletId → store map).
 */

const DB_NAME = 'retro-j2me-rms';
const DB_VERSION = 1;
const STORE = 'midlets';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function idbReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IDB_REQUEST_FAILED'));
  });
}

export class IndexedDbPersistence {
  constructor(dbName = DB_NAME) {
    this.dbName = dbName;
    this._db = null;
  }

  async _dbConn() {
    if (this._db) return this._db;
    // Allow tests to override DB name via constructor by re-open pattern
    const req = indexedDB.open(this.dbName, DB_VERSION);
    this._db = await new Promise((resolve, reject) => {
      req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'));
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
    });
    return this._db;
  }

  async load(midletId) {
    const db = await this._dbConn();
    const tx = db.transaction(STORE, 'readonly');
    const result = await idbReq(tx.objectStore(STORE).get(midletId));
    return result || null;
  }

  async save(midletId, snapshot) {
    const db = await this._dbConn();
    const tx = db.transaction(STORE, 'readwrite');
    await idbReq(tx.objectStore(STORE).put(structuredClone(snapshot), midletId));
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(midletId) {
    const db = await this._dbConn();
    const tx = db.transaction(STORE, 'readwrite');
    await idbReq(tx.objectStore(STORE).delete(midletId));
  }
}

export { openDb, DB_NAME, STORE };
