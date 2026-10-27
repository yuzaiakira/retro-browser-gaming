import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LauncherGamepadNav } from "./launcher-gamepad";

describe("LauncherGamepadNav", () => {
  let rafCbs: FrameRequestCallback[] = [];
  let gamepads: Array<Partial<Gamepad> | null> = [];
  let focusedId = "a";
  const listeners = new Map<string, Set<EventListener>>();

  beforeEach(() => {
    rafCbs = [];
    gamepads = [];
    focusedId = "a";
    listeners.clear();

    const mkBtn = (id: string) => ({
      id,
      tagName: "BUTTON",
      focus: () => {
        focusedId = id;
      },
      click: vi.fn(),
      getAttribute: () => null,
      closest: () => null,
    });
    const buttons = { a: mkBtn("a"), b: mkBtn("b") };

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    vi.stubGlobal("performance", { now: () => 10_000 });

    const root = {
      querySelectorAll: (sel: string) => {
        if (sel.includes("button") || sel.includes("[tabindex]")) {
          return [buttons.a, buttons.b];
        }
        return [];
      },
    };
    const documentMock = {
      body: { innerHTML: "" },
      activeElement: buttons.a as unknown as Element,
      querySelector: (sel: string): unknown => {
        if (sel === "[data-nav-root]" || sel === "main") return root;
        if (sel === ".confirm-dialog" || sel === ".game-menu-backdrop") return null;
        return null;
      },
      querySelectorAll: (sel: string) => {
        if (sel.includes("button") || sel.includes("a[href]")) {
          return [buttons.a, buttons.b];
        }
        return [];
      },
      getElementById: (id: string) => (id === "a" ? buttons.a : buttons.b),
    };

    Object.defineProperty(documentMock, "activeElement", {
      get: () => (focusedId === "a" ? buttons.a : buttons.b),
    });

    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("window", {
      addEventListener: (type: string, fn: EventListener) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: EventListener) => {
        listeners.get(type)?.delete(fn);
      },
      history: { length: 1, back: vi.fn() },
      getComputedStyle: () => ({ display: "block", visibility: "visible" }),
    });
    vi.stubGlobal("navigator", {
      getGamepads: () => gamepads as (Gamepad | null)[],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function tick() {
    const cbs = [...rafCbs];
    rafCbs = [];
    for (const cb of cbs) cb(10_000);
  }

  function makePad(index: number, pressedIndex?: number): Gamepad {
    const buttons = Array.from({ length: 16 }, (_, i) => ({
      pressed: i === pressedIndex,
      touched: false,
      value: i === pressedIndex ? 1 : 0,
    }));
    return {
      id: "test-pad",
      index,
      mapping: "standard",
      connected: true,
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: buttons as Gamepad["buttons"],
      hapticActuators: [],
      vibrationActuator: null,
    } as unknown as Gamepad;
  }

  it("moves focus on d-pad edge and ignores held repeats", () => {
    const nav = new LauncherGamepadNav({
      isGameplayActive: () => false,
    });
    gamepads = [makePad(0, 13)];
    tick();
    expect(focusedId).toBe("b");
    tick();
    expect(focusedId).toBe("b");
    nav.dispose();
  });

  it("skips while gameplay active without overlay", () => {
    const nav = new LauncherGamepadNav({
      isGameplayActive: () => true,
    });
    gamepads = [makePad(0, 13)];
    tick();
    expect(focusedId).toBe("a");
    nav.dispose();
  });

  it("reports unsupported when getGamepads missing", () => {
    vi.stubGlobal("navigator", {});
    const presence: string[] = [];
    const nav = new LauncherGamepadNav({
      isGameplayActive: () => false,
      onPresence: (s) => presence.push(s),
    });
    expect(presence).toContain("unsupported");
    nav.dispose();
  });
});
