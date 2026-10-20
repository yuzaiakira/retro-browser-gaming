/**
 * Isolated J2ME RecordStore PoC (standards-shaped subset).
 * Not wired into production. Persistence backend is injectable for Node tests
 * and can later map to IndexedDB/OPFS in a browser adapter.
 */

export class RecordStoreException extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RecordStoreException';
    this.code = code;
  }
}

const stores = new Map(); // midletId -> Map(storeName -> { nextId, records: Map })

function namespaceKey(midletId, name) {
  return `${midletId}\0${name}`;
}

function assertName(name) {
  if (typeof name !== 'string' || !name.length || name.length > 32) {
    throw new RecordStoreException('Invalid RecordStore name', 'INVALID_NAME');
  }
}

export class MemoryPersistence {
  constructor() {
    this.blob = new Map();
  }
  async load(midletId) {
    return this.blob.get(midletId) || null;
  }
  async save(midletId, snapshot) {
    this.blob.set(midletId, structuredClone(snapshot));
  }
  async clear(midletId) {
    this.blob.delete(midletId);
  }
}

function snapshotOf(midletMap) {
  const out = {};
  for (const [name, store] of midletMap.entries()) {
    out[name] = {
      nextId: store.nextId,
      records: Object.fromEntries(
        [...store.records.entries()].map(([id, bytes]) => [String(id), Array.from(bytes)]),
      ),
    };
  }
  return out;
}

function hydrate(snapshot) {
  const map = new Map();
  for (const [name, store] of Object.entries(snapshot || {})) {
    const records = new Map();
    for (const [id, arr] of Object.entries(store.records || {})) {
      records.set(Number(id), Uint8Array.from(arr));
    }
    map.set(name, { nextId: store.nextId || 1, records });
  }
  return map;
}

export class RecordStoreManager {
  /**
   * @param {{ persistence?: MemoryPersistence, maxBytesPerMidlet?: number }} opts
   */
  constructor(opts = {}) {
    this.persistence = opts.persistence || new MemoryPersistence();
    this.maxBytesPerMidlet = opts.maxBytesPerMidlet ?? 256 * 1024;
    this._open = new Map(); // key -> RecordStore
  }

  async _ensureMidlet(midletId) {
    if (!stores.has(midletId)) {
      const snap = await this.persistence.load(midletId);
      stores.set(midletId, hydrate(snap));
    }
    return stores.get(midletId);
  }

  async _persist(midletId) {
    const map = stores.get(midletId);
    await this.persistence.save(midletId, snapshotOf(map));
  }

  _bytesUsed(midletMap) {
    let n = 0;
    for (const store of midletMap.values()) {
      for (const bytes of store.records.values()) n += bytes.byteLength;
    }
    return n;
  }

  async openRecordStore(midletId, name, createIfNecessary = false) {
    assertName(name);
    if (!midletId || typeof midletId !== 'string') {
      throw new RecordStoreException('MIDlet namespace required', 'INVALID_NAMESPACE');
    }
    const key = namespaceKey(midletId, name);
    if (this._open.has(key)) return this._open.get(key);

    const midletMap = await this._ensureMidlet(midletId);
    if (!midletMap.has(name)) {
      if (!createIfNecessary) {
        throw new RecordStoreException('RecordStore not found', 'NOT_FOUND');
      }
      midletMap.set(name, { nextId: 1, records: new Map() });
      await this._persist(midletId);
    }
    const handle = new RecordStore(this, midletId, name);
    this._open.set(key, handle);
    return handle;
  }

  async deleteRecordStore(midletId, name) {
    assertName(name);
    const key = namespaceKey(midletId, name);
    if (this._open.has(key)) {
      throw new RecordStoreException('RecordStore is open', 'STORE_OPEN');
    }
    const midletMap = await this._ensureMidlet(midletId);
    if (!midletMap.has(name)) {
      throw new RecordStoreException('RecordStore not found', 'NOT_FOUND');
    }
    midletMap.delete(name);
    await this._persist(midletId);
  }

  async listRecordStores(midletId) {
    const midletMap = await this._ensureMidlet(midletId);
    return [...midletMap.keys()].sort();
  }
}

export class RecordStore {
  constructor(manager, midletId, name) {
    this.manager = manager;
    this.midletId = midletId;
    this.name = name;
    this.closed = false;
  }

  _store() {
    if (this.closed) throw new RecordStoreException('RecordStore closed', 'CLOSED');
    const midletMap = stores.get(this.midletId);
    const store = midletMap?.get(this.name);
    if (!store) throw new RecordStoreException('RecordStore missing', 'NOT_FOUND');
    return store;
  }

  async addRecord(data) {
    const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data || []);
    const midletMap = stores.get(this.midletId);
    if (this.manager._bytesUsed(midletMap) + bytes.byteLength > this.manager.maxBytesPerMidlet) {
      throw new RecordStoreException('RecordStore full', 'FULL');
    }
    const store = this._store();
    const id = store.nextId++;
    store.records.set(id, bytes.slice());
    await this.manager._persist(this.midletId);
    return id;
  }

  async setRecord(recordId, data) {
    const store = this._store();
    if (!store.records.has(recordId)) {
      throw new RecordStoreException('Invalid record ID', 'INVALID_RECORD');
    }
    const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data || []);
    const midletMap = stores.get(this.midletId);
    const prev = store.records.get(recordId).byteLength;
    const delta = bytes.byteLength - prev;
    if (delta > 0 && this.manager._bytesUsed(midletMap) + delta > this.manager.maxBytesPerMidlet) {
      throw new RecordStoreException('RecordStore full', 'FULL');
    }
    store.records.set(recordId, bytes.slice());
    await this.manager._persist(this.midletId);
  }

  async getRecord(recordId) {
    const store = this._store();
    const bytes = store.records.get(recordId);
    if (!bytes) throw new RecordStoreException('Invalid record ID', 'INVALID_RECORD');
    return bytes.slice();
  }

  async deleteRecord(recordId) {
    const store = this._store();
    if (!store.records.delete(recordId)) {
      throw new RecordStoreException('Invalid record ID', 'INVALID_RECORD');
    }
    await this.manager._persist(this.midletId);
  }

  async enumerateRecords() {
    const store = this._store();
    return [...store.records.keys()].sort((a, b) => a - b);
  }

  async getNumRecords() {
    return this._store().records.size;
  }

  async closeRecordStore() {
    this.closed = true;
    this.manager._open.delete(namespaceKey(this.midletId, this.name));
  }
}

/** Test helper: drop in-memory process state (simulates browser restart when persistence remains). */
export function resetProcessStores() {
  stores.clear();
}
