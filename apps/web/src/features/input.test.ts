import { describe, expect, it } from 'vitest';
import { commands, defaultKeys } from './input';

describe('default controller mapping', () => {
  it('maps keyboard directions and action buttons to distinct libretro commands', () => {
    expect(defaultKeys.ArrowUp).toBe(commands.Up);
    expect(defaultKeys.ArrowLeft).toBe(commands.Left);
    expect(defaultKeys.KeyZ).toBe(commands.B);
    expect(defaultKeys.KeyX).toBe(commands.A);
    expect(new Set(Object.values(defaultKeys)).size).toBeGreaterThan(8);
  });
});
