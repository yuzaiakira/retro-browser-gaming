import type { ShortcutAction, ShortcutMap } from "./player-prefs";
import { DEFAULT_SHORTCUTS } from "./player-prefs";
import { defaultKeys } from "./input";

export type ShortcutMatch = {
  action: ShortcutAction;
  code: string;
};

/** Authenticated shell-key payload from a trusted emulator frame. */
export type ShellKeyDetail = {
  code: string;
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
};

export type ShortcutValidation =
  | { ok: true; code: string }
  | { ok: false; message: string };

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

/**
 * Browser / OS reserved codes — never bind as player shortcuts.
 * F5 is included: browsers often reload before the player can claim it.
 */
const OS_RESERVED = new Set([
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "F5",
  "F11",
  "F12",
  "Tab",
]);

const F5_MIGRATION_NOTE =
  "F5 is reserved (browser reload). Quick save uses F8; other F5 bindings were cleared.";

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

export function conflictsWithKeymap(
  code: string,
  keymap: Record<string, number> = defaultKeys,
): boolean {
  return Object.prototype.hasOwnProperty.call(keymap, code);
}

/** Migrate unsafe F5 bindings: quickSave → F8; anything else → disabled. */
export function migrateUnsafeShortcutCode(
  action: ShortcutAction,
  code: string | null,
): { code: string | null; migrated: boolean; note?: string } {
  if (code !== "F5") return { code, migrated: false };
  if (action === "quickSave") {
    return { code: "F8", migrated: true, note: F5_MIGRATION_NOTE };
  }
  return { code: null, migrated: true, note: F5_MIGRATION_NOTE };
}

/** Shared shell-key JSON fields forwarded from trusted frames. */
export function shellKeyPayloadFromEvent(e: KeyboardEvent): Record<string, unknown> {
  return {
    type: "shell-key",
    code: e.code,
    key: e.key,
    ctrlKey: !!e.ctrlKey,
    altKey: !!e.altKey,
    metaKey: !!e.metaKey,
    shiftKey: !!e.shiftKey,
    repeat: !!e.repeat,
    isComposing: !!e.isComposing,
  };
}

export function eventTargetIsEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  if (el.isContentEditable) return true;
  return !!el.closest('input,select,textarea,[contenteditable="true"]');
}

export function validateShortcutBinding(
  code: string,
  action: ShortcutAction,
  map: ShortcutMap,
  keymap: Record<string, number> = defaultKeys,
): ShortcutValidation {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 40) {
    return { ok: false, message: "That key code is not valid." };
  }
  if (isOsReservedCode(trimmed)) {
    if (trimmed === "F5") {
      return {
        ok: false,
        message:
          "F5 is reserved by the browser (reload). Use F8 for quick save instead.",
      };
    }
    return {
      ok: false,
      message: `${formatShortcutCode(trimmed)} is reserved by the browser or OS.`,
    };
  }
  if (conflictsWithDefaultGameplay(trimmed) || conflictsWithKeymap(trimmed, keymap)) {
    return {
      ok: false,
      message: `${formatShortcutCode(trimmed)} is used for gameplay controls.`,
    };
  }
  for (const other of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
    if (other === action) continue;
    if (map[other] === trimmed) {
      return {
        ok: false,
        message: `${formatShortcutCode(trimmed)} is already bound to ${shortcutLabel(other)}.`,
      };
    }
  }
  return { ok: true, code: trimmed };
}

/**
 * Parse and validate a shell-key postMessage payload.
 * Never fabricates modifier flags — missing fields fail closed as false.
 */
export function parseShellKeyDetail(data: unknown): ShellKeyDetail | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.code !== "string" || d.code.length === 0 || d.code.length > 40) {
    return null;
  }
  if (typeof d.key !== "string" || d.key.length > 40) return null;
  return {
    code: d.code,
    key: d.key,
    ctrlKey: d.ctrlKey === true,
    altKey: d.altKey === true,
    metaKey: d.metaKey === true,
    shiftKey: d.shiftKey === true,
    repeat: d.repeat === true,
    isComposing: d.isComposing === true,
  };
}

export function shellKeyAsKeyboardLike(
  detail: ShellKeyDetail,
): Pick<
  KeyboardEvent,
  | "code"
  | "key"
  | "ctrlKey"
  | "altKey"
  | "metaKey"
  | "shiftKey"
  | "repeat"
  | "isComposing"
> {
  return {
    code: detail.code,
    key: detail.key,
    ctrlKey: detail.ctrlKey,
    altKey: detail.altKey,
    metaKey: detail.metaKey,
    shiftKey: detail.shiftKey,
    repeat: detail.repeat,
    isComposing: detail.isComposing,
  };
}

export function matchShortcut(
  e: Pick<
    KeyboardEvent,
    | "code"
    | "key"
    | "metaKey"
    | "ctrlKey"
    | "altKey"
    | "shiftKey"
    | "repeat"
    | "isComposing"
  >,
  map: ShortcutMap,
  enabled: boolean,
): ShortcutAction | null {
  if (e.isComposing) return null;
  // Chorded modifiers never invoke ordinary gameplay shortcuts (Ctrl+P, Alt+F, …).
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  // Key-repeat must not spam pause/save/menu.
  if (e.repeat) return null;
  // When shortcuts are disabled, Escape still toggles/closes the menu (a11y);
  // pause/fullscreen/save bindings stay inert.
  if (!enabled) {
    if (e.key === "Escape" || e.code === "Escape" || e.code === map.menu) {
      return "menu";
    }
    return null;
  }
  for (const action of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
    const code = map[action];
    if (!code) continue; // per-action Off
    // Escape is matched by key for broader keyboard layout coverage.
    if (action === "menu" && (e.key === "Escape" || e.code === code)) {
      return "menu";
    }
    if (e.code === code) return action;
  }
  return null;
}

export function uiBlocksShortcuts(
  target: EventTarget | null = typeof document !== "undefined"
    ? document.activeElement
    : null,
): boolean {
  const active = target as HTMLElement | null;
  if (active && typeof active.closest === "function") {
    if (active.closest('input,select,textarea,[contenteditable="true"]'))
      return true;
    if (active.isContentEditable) return true;
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

export { F5_MIGRATION_NOTE };
