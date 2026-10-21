/**
 * Browser IndexedDB persistence for js2me RecordStore (suite-scoped).
 * Same snapshot shape as spikes/j2me-rms (midletId → store map).
 * Every save stamps meta.updatedAt / meta.revision for safe migration merges.
 */
(function (global) {
  const DB_NAME = 'retro-j2me-rms';
  const DB_VERSION = 1;
  const STORE = 'midlets';

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IDB_REQUEST_FAILED'));
    });
  }

  function fingerprintStores(stores) {
    if (!stores) return 'empty';
    const parts = [];
    for (const name of Object.keys(stores).sort()) {
      const records = stores[name]?.records || {};
      for (const key of Object.keys(records).sort()) {
        const rec = records[key];
        const bytes = Array.isArray(rec)
          ? rec
          : rec && typeof rec.length === 'number'
            ? Array.from(rec)
            : [];
        parts.push(`${name}#${key}=${bytes.join(',')}`);
      }
    }
    return parts.join('|') || 'empty';
  }

  function stamp(snapshot, previous) {
    const stores = snapshot?.stores || {};
    const prevRev =
      previous?.meta && typeof previous.meta.revision === 'number' ? previous.meta.revision : 0;
    return {
      stores: structuredClone(stores),
      meta: {
        updatedAt: Date.now(),
        revision: prevRev + 1,
        fingerprint: fingerprintStores(stores),
        origin: snapshot?.meta?.origin || previous?.meta?.origin || location.origin,
      },
    };
  }

  class IndexedDbPersistence {
    constructor(dbName = DB_NAME) {
      this.dbName = dbName;
      this._db = null;
    }

    async _dbConn() {
      if (this._db) return this._db;
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
      const existing = await this.load(midletId);
      const stamped = stamp(snapshot, existing);
      const tx = db.transaction(STORE, 'readwrite');
      await idbReq(tx.objectStore(STORE).put(stamped, midletId));
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB_TX_FAILED'));
        tx.onabort = () => reject(tx.error || new Error('IDB_TX_ABORTED'));
      });
    }

    async clear(midletId) {
      const db = await this._dbConn();
      const tx = db.transaction(STORE, 'readwrite');
      await idbReq(tx.objectStore(STORE).delete(midletId));
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB_TX_FAILED'));
      });
    }

    async listAll() {
      const db = await this._dbConn();
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const keys = await idbReq(store.getAllKeys());
      const suites = [];
      for (const key of keys) {
        const snapshot = await idbReq(store.get(key));
        if (snapshot?.stores) {
          suites.push({ midletId: String(key), snapshot });
        }
      }
      return suites;
    }

    async close() {
      if (this._db) {
        this._db.close();
        this._db = null;
      }
    }
  }

  global.J2meRmsIdb = {
    DB_NAME,
    STORE,
    IndexedDbPersistence,
    fingerprintStores,
    create(dbName) {
      return new IndexedDbPersistence(dbName);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
