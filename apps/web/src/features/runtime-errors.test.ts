import { describe, expect, it } from 'vitest';
import { isMissingRuntimeError, missingRuntimeMessage } from './runtime-errors';

describe('runtime-errors', () => {
  it('detects fetch/404/wasm failures', () => {
    expect(isMissingRuntimeError('Failed to fetch')).toBe(true);
    expect(isMissingRuntimeError('HTTP 404')).toBe(true);
    expect(
      isMissingRuntimeError('Core not authorized for public browser distribution'),
    ).toBe(true);
    expect(isMissingRuntimeError('unrelated')).toBe(false);
  });

  it('surfaces allowlist guidance without claiming counsel approval', () => {
    const msg = missingRuntimeMessage('404');
    expect(msg).toMatch(/allowlisted cores/i);
    expect(msg).toMatch(/81_eo/);
    expect(msg).toMatch(/Details: 404/);
  });
});
