import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { commands, defaultKeys, InputRouter } from "./input";

type SinkCall = [number, number];
type Listener = (event?: Event) => void;

function installTestDom() {
  const listeners = new Map<string, Set<Listener>>();
  const on = (target: string, type: string, fn: Listener) => {
    const key = `${target}:${type}`;
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
  };
  const off = (target: string, type: string, fn: Listener) => {
    listeners.get(`${target}:${type}`)?.delete(fn);
  };
  const fire = (target: string, type: string, event?: Event) => {
    for (const fn of [...(listeners.get(`${target}:${type}`) || [])]) fn(event);
  };

  let rafCb: FrameRequestCallback | null = null;
  let gamepads: Array<Partial<Gamepad> | null> = [];
  let hidden = false;

  class FakeCustomEvent {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const documentMock = {
    get hidden() {
      return hidden;
    },
    activeElement: null as { closest?: (s: string) => unknown } | null,
    addEventListener: (type: string, fn: Listener) => on("document", type, fn),
    removeEventListener: (type: string, fn: Listener) =>
      off("document", type, fn),
    querySelector: () => null,
    dispatchEvent: (event: { type: string }) => {
      fire("document", event.type, event as Event);
      return true;
    },
  };

  const windowMock = {
    addEventListener: (type: string, fn: Listener) => on("window", type, fn),
    removeEventListener: (type: string, fn: Listener) =>
      off("window", type, fn),
    dispatchEvent: (event: { type: string }) => {
      fire("window", event.type, event as Event);
      return true;
    },
  };

  const navigatorMock = {
    getGamepads: () => gamepads as (Gamepad | null)[],
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentMock,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: navigatorMock,
  });
  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: FakeCustomEvent,
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: () => {
      rafCb = null;
    },
  });

  return {
    setGamepads(next: Array<Partial<Gamepad> | null>) {
      gamepads = next;
    },
    setHidden(next: boolean) {
      hidden = next;
      fire("document", "visibilitychange");
    },
    fireBlur() {
      fire("window", "blur");
    },
    tick() {
      const cb = rafCb;
      rafCb = null;
      cb?.(0);
    },
  };
}

describe("default controller mapping", () => {
  it("maps keyboard directions and action buttons to distinct libretro commands", () => {
    expect(defaultKeys.ArrowUp).toBe(commands.Up);
    expect(defaultKeys.ArrowLeft).toBe(commands.Left);
    expect(defaultKeys.KeyZ).toBe(commands.B);
    expect(defaultKeys.KeyX).toBe(commands.A);
    expect(new Set(Object.values(defaultKeys)).size).toBeGreaterThan(8);
  });
});

describe("InputRouter", () => {
  let sink: SinkCall[];
  let events: { source: string; command: number; value: number }[];
  let router: InputRouter;
  let dom: ReturnType<typeof installTestDom>;

  beforeAll(() => {
    dom = installTestDom();
  });

  beforeEach(() => {
    sink = [];
    events = [];
    dom.setGamepads([]);
    dom.setHidden(false);
    window.addEventListener("retro-input", ((e: CustomEvent) => {
      events.push(e.detail);
    }) as EventListener);
    router = new InputRouter((c, v) => sink.push([c, v]), defaultKeys);
  });

  afterEach(() => {
    router.dispose();
  });

  it("dispatches press only on meaningful state changes for a held source", () => {
    router.press("pad:0:0", commands.B, 1);
    router.press("pad:0:0", commands.B, 1);
    router.press("pad:0:0", commands.B, 1);
    expect(sink).toEqual([[commands.B, 1]]);
    expect(
      events.filter((e) => e.source === "pad:0:0" && e.value === 1),
    ).toHaveLength(1);
  });

  it("keeps a command active while another source still holds it", () => {
    router.press("key:ArrowUp", commands.Up, 1);
    router.press("pad:0:12", commands.Up, 1);
    expect(sink.filter(([c]) => c === commands.Up)).toEqual([[commands.Up, 1]]);
    router.release("key:ArrowUp");
    expect(sink.at(-1)).toEqual([commands.Up, 1]);
    router.release("pad:0:12");
    expect(sink.at(-1)).toEqual([commands.Up, 0]);
  });

  it("suspends gameplay input and releases held buttons", () => {
    router.press("pad:0:1", commands.A, 1);
    expect(sink.at(-1)).toEqual([commands.A, 1]);
    router.setSuspended(true);
    expect(sink.at(-1)).toEqual([commands.A, 0]);
    expect(router.isSuspended).toBe(true);
    const before = sink.length;
    router.press("pad:0:1", commands.A, 1);
    expect(sink.length).toBe(before);
    router.setSuspended(false);
    router.press("pad:0:1", commands.A, 1);
    expect(sink.at(-1)).toEqual([commands.A, 1]);
  });

  it("does not re-press from gamepad poll while suspended", () => {
    const buttons = Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }));
    buttons[0] = { pressed: true, touched: true, value: 1 };
    dom.setGamepads([
      { index: 0, buttons, axes: [0, 0] } as unknown as Gamepad,
    ]);

    router.setSuspended(true);
    const before = sink.length;
    dom.tick();
    dom.tick();
    expect(sink.length).toBe(before);

    router.setSuspended(false);
    dom.tick();
    expect(sink.some(([c, v]) => c === commands.B && v === 1)).toBe(true);
    const pressCount = sink.filter(([c, v]) => c === commands.B && v === 1)
      .length;
    dom.tick();
    dom.tick();
    dom.tick();
    expect(
      sink.filter(([c, v]) => c === commands.B && v === 1).length,
    ).toBe(pressCount);
  });

  it("clears inputs on blur and visibility hidden", () => {
    router.press("key:ArrowLeft", commands.Left, 1);
    dom.fireBlur();
    expect(sink.at(-1)).toEqual([commands.Left, 0]);
    router.press("key:ArrowLeft", commands.Left, 1);
    dom.setHidden(true);
    expect(sink.at(-1)).toEqual([commands.Left, 0]);
  });
});
