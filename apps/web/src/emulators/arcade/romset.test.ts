import { describe, expect, it } from 'vitest';
import {
  RBGDOT_ROMSET,
  assertSafeZipMemberName,
  validateRomsetMembers,
  validateRomsetZip,
} from './romset';

async function loadFixtureZip(): Promise<ArrayBuffer> {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const path = resolve(__dirname, '../../../../../.fixtures/mit-arcade-rbgdot.zip');
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe('arcade romset policy', () => {
  it('rejects path traversal names', () => {
    expect(assertSafeZipMemberName('../x.bin')?.code).toBe('ROMSET_ZIP_TRAVERSAL');
    expect(assertSafeZipMemberName('/etc/passwd')?.code).toBe('ROMSET_ZIP_TRAVERSAL');
    expect(assertSafeZipMemberName('ok.bin')).toBeNull();
  });

  it('validates rbgdot members by hash', async () => {
    const id = new Uint8Array(256);
    // Wrong hash must fail
    const bad = await validateRomsetMembers(RBGDOT_ROMSET, new Map([['rbgdot.id', id]]));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('ROMSET_HASH_MISMATCH');
  });

  it('accepts the MIT engineering ZIP', async () => {
    const zip = await loadFixtureZip();
    const result = await validateRomsetZip(RBGDOT_ROMSET, zip, {
      coreCode: 'mame_rbg_arcade',
      driver: 'rbgdot',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.driver).toBe('rbgdot');
      expect(result.uncompressedBytes).toBe(256);
    }
  });

  it('rejects core/driver mismatch', async () => {
    const zip = await loadFixtureZip();
    const result = await validateRomsetZip(RBGDOT_ROMSET, zip, {
      coreCode: 'fbneo',
      driver: 'rbgdot',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ROMSET_CORE_DRIVER_MISMATCH');
  });
});
