/**
 * Local player personalization (Sprint 4).
 *
 * Identity: preferences are keyed by **release id** (`Installation.id`), which
 * matches play URLs and save identity (`releaseId`). Global defaults live under
 * `prefs:v1:global`. Per-release overrides under `prefs:v1:release:<id>`.
 *
 * Precedence: built-in defaults ← global ← per-release overlay.
 * Keyboard maps remain on legacy `keymap` (+ optional `keymap:release:<id>`).
 * Touch layouts stay on existing `layout:v2:<system>` keys — untouched here.
 *
 * Schema uses `schemaVersion` so future fields can migrate without wiping data.
 * Malformed / non-finite values are rejected and fall back to defaults.
 */
import { defaultKeys } from "./input";

export const PREFS_SCHEMA = 1 as const;

export type DisplayMode = "fit" | "original";
export type RenderFilter = "auto" | "sharp" | "smooth";

export type ShortcutAction =
  | "menu"
  | "pause"
  | "fullscreen"
  | "quickSave"
  | "quickLoad";

export type ShortcutMap = Record<ShortcutAction, string | null>;

export type PlayerPrefs = {
  schemaVersion: typeof PREFS_SCHEMA;
  displayMode: DisplayMode;
  renderFilter: RenderFilter;
  volume: number;
  /** true/false force; "auto" follows maxTouchPoints at session start */
  touchVisible: boolean | "auto";
  hudMinimized: boolean;
  shortcutsEnabled: boolean;
  shortcuts: ShortcutMap;
};

export type PlayerPrefsPatch = Partial<
  Omit<PlayerPrefs, "schemaVersion" | "shortcuts">
> & {
  shortcuts?: Partial<ShortcutMap>;
};

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  menu: "Escape",
  pause: "KeyP",
  fullscreen: "KeyF",
  quickSave: "F5",
  quickLoad: "F9",
};

export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
  schemaVersion: PREFS_SCHEMA,
  displayMode: "fit",
  renderFilter: "auto",
  volume: 0.4,
  touchVisible: "auto",
  hudMinimized: false,
  shortcutsEnabled: true,
  shortcuts: { ...DEFAULT_SHORTCUTS },
};

export function globalPrefsKey() {
  return "prefs:v1:global";
}

export function releasePrefsKey(releaseId: string) {
  return `prefs:v1:release:${releaseId}`;
}

export function releaseKeymapKey(releaseId: string) {
  return `keymap:release:${releaseId}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function finite01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function parseDisplayMode(v: unknown, fallback: DisplayMode): DisplayMode {
  return v === "fit" || v === "original" ? v : fallback;
}

function parseRenderFilter(v: unknown, fallback: RenderFilter): RenderFilter {
  return v === "auto" || v === "sharp" || v === "smooth" ? v : fallback;
}

function parseTouch(v: unknown, fallback: boolean | "auto"): boolean | "auto" {
  if (v === "auto" || v === true || v === false) return v;
  return fallback;
}

function parseShortcutCode(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const code = v.trim();
  if (!code || code.length > 40) return undefined;
  return code;
}

function parseShortcuts(
  raw: unknown,
  base: ShortcutMap,
): ShortcutMap {
  const out: ShortcutMap = { ...base };
  if (!isRecord(raw)) return out;
  for (const action of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
    if (!(action in raw)) continue;
    const parsed = parseShortcutCode(raw[action]);
    if (parsed === undefined) continue;
    out[action] = parsed;
  }
  return out;
}

/** Validate and normalize a stored prefs blob; never throws. */
export function normalizePlayerPrefs(
  raw: unknown,
  fallback: PlayerPrefs = DEFAULT_PLAYER_PREFS,
): PlayerPrefs {
  if (!isRecord(raw)) return { ...fallback, shortcuts: { ...fallback.shortcuts } };
  const schema = raw.schemaVersion;
  if (schema !== PREFS_SCHEMA && schema !== undefined) {
    // Unknown future/past versions: keep only known fields that validate.
  }
  return {
    schemaVersion: PREFS_SCHEMA,
    displayMode: parseDisplayMode(raw.displayMode, fallback.displayMode),
    renderFilter: parseRenderFilter(raw.renderFilter, fallback.renderFilter),
    volume: finite01(raw.volume, fallback.volume),
    touchVisible: parseTouch(raw.touchVisible, fallback.touchVisible),
    hudMinimized:
      typeof raw.hudMinimized === "boolean"
        ? raw.hudMinimized
        : fallback.hudMinimized,
    shortcutsEnabled:
      typeof raw.shortcutsEnabled === "boolean"
        ? raw.shortcutsEnabled
        : fallback.shortcutsEnabled,
    shortcuts: parseShortcuts(raw.shortcuts, fallback.shortcuts),
  };
}

export function mergePlayerPrefs(
  base: PlayerPrefs,
  overlay: PlayerPrefsPatch | null | undefined,
): PlayerPrefs {
  if (!overlay) return { ...base, shortcuts: { ...base.shortcuts } };
  return normalizePlayerPrefs(
    {
      ...base,
      ...overlay,
      shortcuts: { ...base.shortcuts, ...(overlay.shortcuts || {}) },
    },
    base,
  );
}

export function sanitizeKeymap(
  raw: unknown,
): Record<string, number> {
  if (!isRecord(raw)) return { ...defaultKeys };
  const out: Record<string, number> = {};
  for (const [code, cmd] of Object.entries(raw)) {
    if (typeof code !== "string" || !code || code.length > 40) continue;
    const n = typeof cmd === "number" ? cmd : Number(cmd);
    if (!Number.isFinite(n) || n < 0 || n > 15) continue;
    out[code] = Math.floor(n);
  }
  return Object.keys(out).length ? out : { ...defaultKeys };
}

export function resolveTouchVisible(
  pref: boolean | "auto",
  hasTouch: boolean,
): boolean {
  if (pref === "auto") return hasTouch;
  return pref;
}
