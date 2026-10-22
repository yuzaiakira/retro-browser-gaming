import { describe, expect, it } from 'vitest';
import { isAllowedMessageOrigin } from './frame-adapter';

describe('isAllowedMessageOrigin', () => {
  it('allows opaque native HTML origins when target is the * sentinel', () => {
    expect(isAllowedMessageOrigin('*', 'null')).toBe(true);
    expect(isAllowedMessageOrigin('*', 'http://launcher.localhost:13000')).toBe(true);
  });

  it('skips the check when targetOrigin is empty', () => {
    expect(isAllowedMessageOrigin('', 'null')).toBe(true);
  });

  it('requires an exact match for dedicated J2ME origins', () => {
    expect(isAllowedMessageOrigin('http://j2me.localhost:13000', 'http://j2me.localhost:13000')).toBe(
      true,
    );
    expect(isAllowedMessageOrigin('http://j2me.localhost:13000', 'http://evil.example')).toBe(false);
    expect(isAllowedMessageOrigin('http://j2me.localhost:13000', 'null')).toBe(false);
  });
});
