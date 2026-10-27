import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_PREFS,
  mergePatches,
  mergePlayerPrefs,
  normalizePlayerPrefs,
  parseReleaseOverlay,
  resolveTouchVisible,
  sanitizeKeymap,
  toReleaseOverlayRecord,
} from "./player-prefs";
import {
  aspectForConsole,
  integerScalingSupport,
  iframeImageRendering,
  renderFilterHonesty,
} from "./player-display";
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

describe("layered release overlays", () => {
  it("parses sparse overlays without inventing volume", () => {
    const patch = parseReleaseOverlay({ displayMode: "original" });
    expect(patch).toEqual({ displayMode: "original" });
    expect(patch && "volume" in patch).toBe(false);
  });

  it("display override does not freeze global volume", () => {
    const global = normalizePlayerPrefs({ volume: 0.15, displayMode: "fit" });
    const overlay = parseReleaseOverlay({ displayMode: "original" });
    const merged = mergePlayerPrefs(global, overlay);
    expect(merged.displayMode).toBe("original");
    expect(merged.volume).toBe(0.15);
    const afterGlobalVolume = mergePlayerPrefs(
      normalizePlayerPrefs({ ...global, volume: 0.7 }),
      overlay,
    );
    expect(afterGlobalVolume.volume).toBe(0.7);
    expect(afterGlobalVolume.displayMode).toBe("original");
  });

  it("explicit volume override stays independent of global", () => {
    const global = normalizePlayerPrefs({ volume: 0.2 });
    const overlay = mergePatches(
      parseReleaseOverlay({ displayMode: "original" }),
      { volume: 0.95 },
    );
    expect(mergePlayerPrefs(global, overlay).volume).toBe(0.95);
    const louderGlobal = normalizePlayerPrefs({ volume: 0.5 });
    expect(mergePlayerPrefs(louderGlobal, overlay).volume).toBe(0.95);
  });

  it("deep-merges nested shortcut mappings", () => {
    const global = normalizePlayerPrefs({
      shortcuts: { pause: "KeyP", quickSave: "F8" },
    });
    const overlay = parseReleaseOverlay({
      shortcuts: { pause: "KeyO" },
    });
    const merged = mergePlayerPrefs(global, overlay);
    expect(merged.shortcuts.pause).toBe("KeyO");
    expect(merged.shortcuts.quickSave).toBe("F8");
    expect(merged.shortcuts.menu).toBe("Escape");
  });

  it("preserves legacy full snapshots as full overrides (no silent discard)", () => {
    const legacy = {
      schemaVersion: 1,
      displayMode: "original",
      renderFilter: "sharp",
      volume: 0.33,
      touchVisible: "auto",
      hudMinimized: true,
      shortcutsEnabled: true,
      shortcuts: { ...DEFAULT_PLAYER_PREFS.shortcuts, pause: "KeyQ" },
    };
    const patch = parseReleaseOverlay(legacy);
    expect(patch?.volume).toBe(0.33);
    expect(patch?.displayMode).toBe("original");
    expect(patch?.hudMinimized).toBe(true);
    expect(patch?.shortcuts?.pause).toBe("KeyQ");
    const global = normalizePlayerPrefs({ volume: 0.9, displayMode: "fit" });
    const merged = mergePlayerPrefs(global, patch);
    expect(merged.volume).toBe(0.33);
    expect(merged.displayMode).toBe("original");
  });

  it("writes overlay envelope without expanding missing keys", () => {
    const record = toReleaseOverlayRecord({ displayMode: "original" });
    expect(record?.kind).toBe("overlay");
    expect(record?.patch).toEqual({ displayMode: "original" });
    const roundTrip = parseReleaseOverlay(record);
    expect(roundTrip).toEqual({ displayMode: "original" });
  });

  it("reset overlay restores global inheritance", () => {
    const global = normalizePlayerPrefs({ volume: 0.55, displayMode: "fit" });
    expect(mergePlayerPrefs(global, null).volume).toBe(0.55);
    expect(mergePlayerPrefs(global, undefined).displayMode).toBe("fit");
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

  it("documents filter honesty (iframe CSS ≠ framebuffer)", () => {
    expect(renderFilterHonesty("sharp")).toMatch(/iframe/i);
    expect(renderFilterHonesty("sharp")).toMatch(/not true integer/i);
    expect(renderFilterHonesty("smooth")).toMatch(/iframe/i);
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
