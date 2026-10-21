/**
 * MIDP RecordStore backed by in-memory suite snapshot + durable IndexedDB flush.
 * Sync Java ME API: mutating / cold-open paths suspend the js2me thread until IDB completes.
 *
 * Snapshot shape (per midletId):
 *   { stores: { [storeName]: { size, version, lastModified, records: { [id]: number[] } } } }
 */
js2me.createClass({
  construct: function (storeName) {
    this.storeName = storeName;
    this.isClosed = false;
  },

  $openRecordStore$Ljava_lang_String_Z$Ljavax_microedition_rms_RecordStore_: function (
    recordStoreName,
    createIfNecessary,
  ) {
    var name = recordStoreName.text;
    var suite = js2me.rmsEnsureSuite();
    var existing = suite.stores[name];
    if (existing) {
      return new javaRoot.$javax.$microedition.$rms.$RecordStore(name);
    }
    if (!createIfNecessary) {
      throw new javaRoot.$javax.$microedition.$rms.$RecordStoreNotFoundException();
    }
    suite.stores[name] = {
      size: 0,
      version: 0,
      lastModified: 0,
      records: {},
    };
    return js2me.rmsDurableReturn(new javaRoot.$javax.$microedition.$rms.$RecordStore(name));
  },

  $deleteRecord$I$V: function (id) {
    this._assertOpen();
    var store = this._store();
    if (!store.records[id]) {
      throw new javaRoot.$javax.$microedition.$rms.$InvalidRecordIDException();
    }
    delete store.records[id];
    store.version++;
    store.lastModified = Date.now();
    js2me.rmsDurableReturn(undefined);
  },

  $getNumRecords$$I: function () {
    this._assertOpen();
    // MIDP-ish: nextRecordId - 1 (matches upstream js2me localStorage size)
    return this._store().size || 0;
  },

  $getLastModified$$J: function () {
    this._assertOpen();
    var time = this._store().lastModified || 0;
    return { hi: Math.floor(time / 0x100000000), lo: time % 0x100000000 };
  },

  $getVersion$$I: function () {
    this._assertOpen();
    return this._store().version || 0;
  },

  $addRecord$_BII$I: function (data, offset, numBytes) {
    this._assertOpen();
    var store = this._store();
    var id = (store.size || 0) + 1;
    store.size = id;
    this._writeBytes(store, id, data, offset, numBytes);
    return js2me.rmsDurableReturn(id);
  },

  $getNextRecordID$$I: function () {
    this._assertOpen();
    return (this._store().size || 0) + 1;
  },

  $getRecord$I$_B: function (id) {
    this._assertOpen();
    var store = this._store();
    var arr = store.records[id];
    if (!arr) {
      throw new javaRoot.$javax.$microedition.$rms.$InvalidRecordIDException();
    }
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      result[i] = arr[i] > 127 ? arr[i] - 256 : arr[i];
    }
    return result;
  },

  $getRecord$I_BI$I: function (id, buffer, offset) {
    var array = this.$getRecord$I$_B(id);
    if (array.length > buffer.length - offset) {
      throw new javaRoot.$java.$lang.$ArrayIndexOutOfBoundsException();
    }
    for (var i = 0; i < array.length; i++) {
      buffer[offset + i] = array[i];
    }
    return array.length;
  },

  $getRecordSize$I$I: function (id) {
    return this.$getRecord$I$_B(id).length;
  },

  $enumerateRecords$Ljavax_microedition_rms_RecordFilter_Ljavax_microedition_rms_RecordComparator_Z$Ljavax_microedition_rms_RecordEnumeration_:
    function (filter, comparator, keepUpdated) {
      if (filter || comparator || keepUpdated) {
        throw new Error('RecordStore: filter and comparator not supported');
      }
      return new javaRoot.$javax.$microedition.$rms.$RecordEnumerationImpl(this);
    },

  $getSizeAvailable$$I: function () {
    this._assertOpen();
    var used = 0;
    var suite = js2me.rmsEnsureSuite();
    for (var n in suite.stores) {
      var recs = suite.stores[n].records;
      for (var id in recs) {
        used += recs[id].length;
      }
    }
    return Math.max(0, (js2me.rmsQuotaBytes || 256 * 1024) - used);
  },

  $closeRecordStore$$V: function () {
    this.isClosed = true;
  },

  $listRecordStores$$_Ljava_lang_String_: function () {
    var suite = js2me.rmsEnsureSuite();
    var result = [];
    for (var name in suite.stores) {
      result.push(new javaRoot.$java.$lang.$String(name));
    }
    return result;
  },

  $deleteRecordStore$Ljava_lang_String_$V: function (recordStoreName) {
    var name = recordStoreName.text;
    var suite = js2me.rmsEnsureSuite();
    delete suite.stores[name];
    js2me.rmsDurableReturn(undefined);
  },

  $setRecord$I_BII$V: function (id, data, offset, numBytes) {
    this._assertOpen();
    var store = this._store();
    if (id > (store.size || 0) || id < 1) {
      throw new javaRoot.$javax.$microedition.$rms.$InvalidRecordIDException();
    }
    this._writeBytes(store, id, data, offset, numBytes);
    js2me.rmsDurableReturn(undefined);
  },

  _writeBytes: function (store, id, data, offset, numBytes) {
    var bytes = [];
    if (data) {
      for (var i = 0; i < numBytes; i++) {
        var v = data[offset + i];
        bytes.push(v < 0 ? v + 256 : v);
      }
    }
    var used = 0;
    var suite = js2me.rmsEnsureSuite();
    for (var n in suite.stores) {
      var recs = suite.stores[n].records;
      for (var rid in recs) {
        if (n === this.storeName && Number(rid) === id) continue;
        used += recs[rid].length;
      }
    }
    var quota = js2me.rmsQuotaBytes || 256 * 1024;
    if (used + bytes.length > quota) {
      throw new javaRoot.$javax.$microedition.$rms.$RecordStoreFullException();
    }
    store.records[id] = bytes;
    store.lastModified = Date.now();
    store.version = (store.version || 0) + 1;
  },

  _store: function () {
    var suite = js2me.rmsEnsureSuite();
    var store = suite.stores[this.storeName];
    if (!store) {
      throw new javaRoot.$javax.$microedition.$rms.$RecordStoreNotOpenException();
    }
    return store;
  },

  _assertOpen: function () {
    if (this.isClosed) {
      throw new javaRoot.$javax.$microedition.$rms.$RecordStoreNotOpenException();
    }
  },

  require: [
    'javaRoot.$javax.$microedition.$rms.$InvalidRecordIDException',
    'javaRoot.$javax.$microedition.$rms.$RecordStoreNotFoundException',
    'javaRoot.$javax.$microedition.$rms.$RecordStoreException',
    'javaRoot.$javax.$microedition.$rms.$RecordStoreFullException',
    'javaRoot.$javax.$microedition.$rms.$RecordStoreNotOpenException',
    'javaRoot.$javax.$microedition.$rms.$RecordEnumerationImpl',
  ],
});

js2me.rmsEnsureSuite = function () {
  if (!js2me.rmsSuite) {
    js2me.rmsSuite = { stores: {} };
  }
  if (!js2me.rmsSuite.stores) {
    js2me.rmsSuite.stores = {};
  }
  return js2me.rmsSuite;
};

/**
 * Suspend the current js2me thread until IndexedDB put completes, then resume with returnValue.
 */
js2me.rmsDurableReturn = function (returnValue) {
  if (!js2me.rmsPersistence || !js2me.rmsMidletId) {
    return returnValue;
  }
  var async = true;
  var err = null;
  var threadId = js2me.currentThread;
  var snapshot = js2me.rmsEnsureSuite();
  js2me.rmsPersistence
    .save(js2me.rmsMidletId, snapshot)
    .then(function () {
      async = false;
      js2me.restoreThread(threadId);
    })
    .catch(function (e) {
      err = e;
      async = false;
      js2me.restoreThread(threadId);
    });
  if (async) {
    js2me.isThreadSuspended = true;
    js2me.restoreStack[threadId] = [
      function () {
        if (err) {
          throw new javaRoot.$javax.$microedition.$rms.$RecordStoreException(
            String(err.message || err),
          );
        }
        return returnValue;
      },
    ];
    return;
  }
  if (err) {
    throw new javaRoot.$javax.$microedition.$rms.$RecordStoreException(String(err.message || err));
  }
  return returnValue;
};
