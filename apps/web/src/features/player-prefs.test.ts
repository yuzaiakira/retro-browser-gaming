import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_PREFS,
  mergePlayerPrefs,
  normalizePlayerPrefs,
  resolveTouchVisible,
  sanitizeKeymap,
} from "./player-prefs";
import { aspectForConsole, integerScalingSupport, iframeImageRendering } from "./player-display";
import { matchShortcut, conflictsWithDefaultGameplay } from "./player-shortcuts";

describe("normalizePlayerPrefs", () => {
  it("returns defaults for garbage", () => {
    expect(normalizePlayerPrefs(null).volume).toBe(0.4);
    expect(normalizePlayerPrefs("x").displayMode).toBe("fit");
  });

  it("rejects non-finite volume", () => {
    expect(normalizePlayerPrefs({ volume: NaN }).volume).toBe(0.4);
    expect(normalizePlayerPrefs({ volume: Infinity }).volume).toBe(0.4);
    expect(normalizePlayerPrefs({ volume: 0.8 }).volume).toBe(0.8);
  });

  it("clamps volume", () => {
    expect(normalizePlayerPrefs({ volume: 2 }).volume).toBe(1);
    expect(normalizePlayerPrefs({ volume: -1 }).volume).toBe(0);
  });

  it("merges release overlay over global", () => {
    const global = normalizePlayerPrefs({ volume: 0.2, displayMode: "fit" });
    const merged = mergePlayerPrefs(global, {
      volume: 0.9,
      displayMode: "original",
    });
    expect(merged.volume).toBe(0.9);
    expect(merged.displayMode).toBe("original");
    expect(merged.renderFilter).toBe("auto");
  });

  it("isolates shortcut null (disabled) from missing", () => {
    const p = normalizePlayerPrefs({
      shortcuts: { pause: null, menu: "Escape" },
    });
    expect(p.shortcuts.pause).toBeNull();
    expect(p.shortcuts.menu).toBe("Escape");
    expect(p.shortcuts.fullscreen).toBe(DEFAULT_PLAYER_PREFS.shortcuts.fullscreen);
  });
});

describe("sanitizeKeymap", () => {
  it("drops bad codes and commands", () => {
    const k = sanitizeKeymap({ KeyZ: 0, bad: 99, KeyX: "nope", ArrowUp: 4 });
    expect(k.KeyZ).toBe(0);
    expect(k.ArrowUp).toBe(4);
    expect(k.bad).toBeUndefined();
    expect(k.KeyX).toBeUndefined();
  });
});

describe("resolveTouchVisible", () => {
  it("auto follows device", () => {
    expect(resolveTouchVisible("auto", true)).toBe(true);
    expect(resolveTouchVisible("auto", false)).toBe(false);
    expect(resolveTouchVisible(true, false)).toBe(true);
  });
});

describe("player-display", () => {
  it("uses documented fallbacks without inventing exact native res", () => {
    const g = aspectForConsole("genesis");
    expect(g.source).toBe("documented-fallback");
    expect(g.css).toContain("4");
    const unknown = aspectForConsole("unknown-system");
    expect(unknown.source).toBe("default-4-3");
  });

  it("disables integer scaling honestly", () => {
    expect(integerScalingSupport().supported).toBe(false);
    expect(integerScalingSupport().reason.length).toBeGreaterThan(20);
  });

  it("scopes image-rendering values", () => {
    expect(iframeImageRendering("sharp")).toBe("pixelated");
    expect(iframeImageRendering("smooth")).toBe("smooth");
    expect(iframeImageRendering("auto")).toBe("auto");
  });
});

describe("player-shortcuts", () => {
  it("matches codes without modifier chords", () => {
    const map = { ...DEFAULT_PLAYER_PREFS.shortcuts };
    const pause = matchShortcut(
      { code: "KeyP", key: "p", metaKey: false, ctrlKey: false, altKey: false, repeat: false } as KeyboardEvent,
      map,
      true,
    );
    expect(pause).toBe("pause");
    const blocked = matchShortcut(
      { code: "KeyP", key: "p", metaKey: true, ctrlKey: false, altKey: false, repeat: false } as KeyboardEvent,
      map,
      true,
    );
    expect(blocked).toBeNull();
  });

  it("flags default gameplay conflicts", () => {
    expect(conflictsWithDefaultGameplay("ArrowUp")).toBe(true);
    expect(conflictsWithDefaultGameplay("KeyF")).toBe(false);
  });
});
