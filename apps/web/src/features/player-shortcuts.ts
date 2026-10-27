import type { ShortcutAction, ShortcutMap } from "./player-prefs";
import { DEFAULT_SHORTCUTS } from "./player-prefs";

export type ShortcutMatch = {
  action: ShortcutAction;
  code: string;
};

const GAMEPLAY_RESERVED = new Set([
  // Left for InputRouter — shortcuts must not steal common game keys by default.
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyZ",
  "KeyX",
  "KeyA",
  "KeyS",
  "KeyQ",
  "KeyW",
  "Enter",
  "ShiftRight",
  "ShiftLeft",
  "Space",
]);

/** OS / browser reserved — never bind as customizable gameplay shortcuts. */
const OS_RESERVED = new Set([
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "F11",
  "F12",
  "Tab",
]);

export function shortcutLabel(action: ShortcutAction): string {
  switch (action) {
    case "menu":
      return "Open / close menu";
    case "pause":
      return "Pause / resume";
    case "fullscreen":
      return "Fullscreen";
    case "quickSave":
      return "Quick save";
    case "quickLoad":
      return "Quick load";
  }
}

export function isOsReservedCode(code: string): boolean {
  return OS_RESERVED.has(code);
}

export function conflictsWithDefaultGameplay(code: string): boolean {
  return GAMEPLAY_RESERVED.has(code);
}

export function matchShortcut(
  e: KeyboardEvent,
  map: ShortcutMap,
  enabled: boolean,
): ShortcutAction | null {
  if (!enabled) return null;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.repeat && (e.code === "F5" || e.code === "F8" || e.code === "F9"))
    return null;
  for (const action of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
    const code = map[action];
    if (!code) continue;
    // Escape is matched by key for broader keyboard layout coverage.
    if (action === "menu" && (e.key === "Escape" || e.code === code)) {
      return "menu";
    }
    if (e.code === code) return action;
  }
  return null;
}

export function uiBlocksShortcuts(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.closest === "function") {
    if (active.closest('input,select,textarea,[contenteditable="true"]'))
      return true;
  }
  return false;
}

export function formatShortcutCode(code: string | null): string {
  if (!code) return "Off";
  if (code === "Escape") return "Esc";
  if (code.startsWith("Key") && code.length === 4) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}
