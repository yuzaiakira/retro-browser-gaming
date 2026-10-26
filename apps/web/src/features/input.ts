export const commands: Record<string, number> = {
  B: 0,
  Y: 1,
  Select: 2,
  Start: 3,
  Up: 4,
  Down: 5,
  Left: 6,
  Right: 7,
  A: 8,
  X: 9,
  L: 10,
  R: 11,
  L2: 12,
  R2: 13,
};

export const defaultKeys: Record<string, number> = {
  ArrowUp: 4,
  ArrowDown: 5,
  ArrowLeft: 6,
  ArrowRight: 7,
  KeyZ: 0,
  KeyX: 8,
  KeyA: 1,
  KeyS: 9,
  Enter: 3,
  ShiftRight: 2,
  KeyQ: 10,
  KeyW: 11,
};

/** Standard gamepad button index → libretro command. */
const PAD_BUTTON_MAP = [0, 8, 1, 9, 10, 11, 12, 13, 2, 3, 14, 15, 4, 5, 6, 7];

const AXIS_PRESS = 0.35;
const AXIS_RELEASE = 0.28;

type SourceState = { command: number; value: number };

function approxEqual(a: number, b: number) {
  return a === b || Math.abs(a - b) < 1;
}

/**
 * Multiplexes keyboard, gamepad, and touch into the emulator adapter.
 * Change-based: held pads do not re-dispatch identical values every frame.
 * Suspension clears active inputs and blocks new gameplay presses (menus/dialogs).
 */
export class InputRouter {
  private inputs = new Map<string, SourceState>();
  private lastSink = new Map<number, number>();
  private pads = new Set<string>();
  private axisOn = new Map<string, boolean>();
  private frame = 0;
  private suspended = false;
  private disposed = false;

  constructor(
    private sink: (command: number, value: number) => void,
    private keys: Record<string, number>,
  ) {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.clear);
    window.addEventListener("gamepaddisconnected", this.onPadGone);
    document.addEventListener("visibilitychange", this.visibility);
    this.frame = requestAnimationFrame(this.poll);
  }

  get isSuspended() {
    return this.suspended;
  }

  /** Suspend gameplay input (menu, confirm, pause, touch edit). Releases held buttons. */
  setSuspended(next: boolean) {
    if (this.disposed || this.suspended === next) return;
    this.suspended = next;
    if (next) this.clear();
  }

  press(source: string, command: number, value = 1) {
    if (this.disposed || this.suspended) return;
    const prev = this.inputs.get(source);
    if (prev && prev.command === command && approxEqual(prev.value, value)) {
      return;
    }
    if (prev && prev.command !== command) {
      this.inputs.delete(source);
      this.flushCommand(prev.command);
    }
    this.inputs.set(source, { command, value });
    this.flushCommand(command);
    this.emitSource(source, command, value);
  }

  release(source: string) {
    const item = this.inputs.get(source);
    if (!item) return;
    this.inputs.delete(source);
    this.flushCommand(item.command);
    this.emitSource(source, item.command, 0);
  }

  clear = () => {
    const commandsHeld = new Set(
      [...this.inputs.values()].map((x) => x.command),
    );
    this.inputs.clear();
    this.pads.clear();
    this.axisOn.clear();
    for (const c of commandsHeld) this.flushCommand(c);
    for (const c of commandsHeld) this.emitSource("clear", c, 0);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.clear();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.clear);
    window.removeEventListener("gamepaddisconnected", this.onPadGone);
    document.removeEventListener("visibilitychange", this.visibility);
  }

  private resolveValue(command: number): number {
    let best = 0;
    for (const item of this.inputs.values()) {
      if (item.command !== command) continue;
      if (Math.abs(item.value) >= Math.abs(best)) best = item.value;
    }
    return best;
  }

  private flushCommand(command: number) {
    const value = this.resolveValue(command);
    if (this.lastSink.get(command) === value) return;
    this.lastSink.set(command, value);
    this.sink(command, value);
  }

  private emitSource(source: string, command: number, value: number) {
    window.dispatchEvent(
      new CustomEvent("retro-input", { detail: { source, command, value } }),
    );
  }

  private visibility = () => {
    if (document.hidden) this.clear();
  };

  private onPadGone = (e: Event) => {
    const index = (e as GamepadEvent).gamepad?.index;
    if (index === undefined) return;
    const prefix = `pad:${index}:`;
    const axisPrefix = `axis:${index}:`;
    for (const key of [...this.inputs.keys()]) {
      if (key.startsWith(prefix) || key.startsWith(axisPrefix)) this.release(key);
    }
    for (const key of [...this.pads]) {
      if (key.startsWith(prefix) || key.startsWith(axisPrefix)) this.pads.delete(key);
    }
    for (const key of [...this.axisOn.keys()]) {
      if (key.startsWith(axisPrefix)) this.axisOn.delete(key);
    }
  };

  private uiBlocksKeys(): boolean {
    if (this.suspended) return true;
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.closest === "function") {
      if (active.closest('input,select,textarea,[contenteditable="true"]'))
        return true;
      if (active.closest('[role="dialog"],[role="alertdialog"]')) return true;
    }
    if (document.querySelector(".game-menu-backdrop,.confirm-backdrop"))
      return true;
    return false;
  }

  private keydown = (e: KeyboardEvent) => {
    if (this.uiBlocksKeys()) return;
    const cmd = this.keys[e.code];
    if (cmd === undefined) return;
    e.preventDefault();
    if (!e.repeat) this.press("key:" + e.code, cmd);
  };

  private keyup = (e: KeyboardEvent) => this.release("key:" + e.code);

  private poll = () => {
    if (this.disposed) return;
    const current = new Set<string>();
    if (!this.suspended && !document.hidden && navigator.getGamepads) {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        pad.buttons.forEach((button, index) => {
          const command = PAD_BUTTON_MAP[index];
          if (command === undefined) return;
          const key = `pad:${pad.index}:${index}`;
          if (button.pressed) {
            current.add(key);
            this.press(key, command);
          }
        });
        pad.axes.slice(0, 2).forEach((v, index) => {
          for (const direction of [-1, 1] as const) {
            const key = `axis:${pad.index}:${index}:${direction}`;
            const magnitude = v * direction;
            const wasOn = this.axisOn.get(key) === true;
            const on = wasOn
              ? magnitude > AXIS_RELEASE
              : magnitude > AXIS_PRESS;
            this.axisOn.set(key, on);
            if (on) {
              current.add(key);
              this.press(
                key,
                index === 0 ? (direction < 0 ? 6 : 7) : direction < 0 ? 4 : 5,
              );
            }
          }
        });
      }
    }
    for (const key of this.pads) {
      if (!current.has(key)) this.release(key);
    }
    this.pads = current;
    this.frame = requestAnimationFrame(this.poll);
  };
}
