import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MemoryPersistence,
  RecordStoreException,
  RecordStoreManager,
  resetProcessStores,
} from './record-store.mjs';

test.beforeEach(() => {
  resetProcessStores();
});

test('open/create/delete and namespace isolation', async () => {
  const persistence = new MemoryPersistence();
  const mgr = new RecordStoreManager({ persistence });

  const a = await mgr.openRecordStore('midlet.a', 'scores', true);
  await a.addRecord(Uint8Array.from([1, 2, 3]));
  await a.closeRecordStore();

  const b = await mgr.openRecordStore('midlet.b', 'scores', true);
  assert.equal(await b.getNumRecords(), 0);
  await b.closeRecordStore();

  await assert.rejects(
    () => mgr.deleteRecordStore('midlet.a', 'missing'),
    (err) => err instanceof RecordStoreException && err.code === 'NOT_FOUND',
  );

  const reopen = await mgr.openRecordStore('midlet.a', 'scores', false);
  assert.equal(await reopen.getNumRecords(), 1);
  await reopen.closeRecordStore();
  await mgr.deleteRecordStore('midlet.a', 'scores');
  assert.deepEqual(await mgr.listRecordStores('midlet.a'), []);
});

test('insert update enumerate remove with integrity', async () => {
  const mgr = new RecordStoreManager();
  const rs = await mgr.openRecordStore('game.x', 'save', true);
  const id1 = await rs.addRecord(Uint8Array.from([9]));
  const id2 = await rs.addRecord(Uint8Array.from([8, 7]));
  assert.deepEqual(await rs.enumerateRecords(), [id1, id2]);
  await rs.setRecord(id1, Uint8Array.from([9, 9]));
  assert.deepEqual([...(await rs.getRecord(id1))], [9, 9]);
  await rs.deleteRecord(id2);
  assert.deepEqual(await rs.enumerateRecords(), [id1]);
  await rs.closeRecordStore();
});

test('quota FULL and durable restart via persistence', async () => {
  const persistence = new MemoryPersistence();
  const mgr = new RecordStoreManager({ persistence, maxBytesPerMidlet: 8 });
  const rs = await mgr.openRecordStore('quota.app', 'rs', true);
  await rs.addRecord(Uint8Array.from([1, 2, 3, 4]));
  await assert.rejects(
    () => rs.addRecord(Uint8Array.from([1, 2, 3, 4, 5])),
    (err) => err instanceof RecordStoreException && err.code === 'FULL',
  );
  await rs.closeRecordStore();

  // Simulate browser restart: process maps cleared, persistence remains.
  resetProcessStores();
  const mgr2 = new RecordStoreManager({ persistence, maxBytesPerMidlet: 8 });
  const again = await mgr2.openRecordStore('quota.app', 'rs', false);
  assert.equal(await again.getNumRecords(), 1);
  assert.deepEqual([...(await again.getRecord(1))], [1, 2, 3, 4]);
  await again.closeRecordStore();
});

test('cannot delete while open', async () => {
  const mgr = new RecordStoreManager();
  await mgr.openRecordStore('m', 's', true);
  await assert.rejects(
    () => mgr.deleteRecordStore('m', 's'),
    (err) => err instanceof RecordStoreException && err.code === 'STORE_OPEN',
  );
});
