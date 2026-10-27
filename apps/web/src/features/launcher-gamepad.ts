/**
 * Launcher / overlay gamepad focus navigation (Sprint 5).
 *
 * Simulated Gamepad API only — physical certification remains NOT_VERIFIED.
 * Mapping (consistent with GameMenu Start/Select confirm/back):
 *   D-pad / left stick → move focus
 *   Start (9) / A (0) → activate focused control
 *   Select (8) / B (1) → Back / Cancel
 *
 * Change-based edges only. Neutral gate on context change prevents a held
 * gameplay button from firing UI actions when a menu opens.
 */

export type GamepadPresence =
  | "unsupported"
  | "none"
  | "connected"
  | "disconnected";

export type LauncherPadAction = "up" | "down" | "left" | "right" | "confirm" | "back";

const AXIS_PRESS = 0.5;
const AXIS_RELEASE = 0.35;

function focusableIn(root: ParentNode): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (el.closest("[hidden]")) return false;
    return true;
  });
}

function activeOverlayRoot(): HTMLElement | null {
  // Game menus own a dedicated Start/Select poller — confirm dialogs use this nav.
  return document.querySelector<HTMLElement>(".confirm-dialog");
}

function launcherRoot(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("[data-nav-root]") ||
    document.querySelector<HTMLElement>("main") ||
    document.body
  );
}

function navTargets(): HTMLElement[] {
  const overlay = activeOverlayRoot();
  if (overlay) return focusableIn(overlay);
  const root = launcherRoot();
  if (!root) return [];
  // Prefer primary chrome + content; skip player iframe internals.
  return focusableIn(root).filter(
    (el) => !el.closest(".player-stage") && !el.closest("iframe"),
  );
}

function moveFocus(dir: "up" | "down" | "left" | "right") {
  const list = navTargets();
  if (!list.length) return;
  const active = document.activeElement as HTMLElement | null;
  let idx = list.indexOf(active as HTMLElement);
  if (idx < 0) {
    list[0]?.focus();
    return;
  }
  if (dir === "down" || dir === "right") {
    list[(idx + 1) % list.length]?.focus();
  } else {
    list[(idx - 1 + list.length) % list.length]?.focus();
  }
}

function activateFocused() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || !navTargets().includes(el)) return;
  // Never auto-fire dangerous controls via focus alone — require explicit confirm edge.
  if (el.tagName === "A" || el.tagName === "BUTTON") {
    el.click();
    return;
  }
  if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
    el.focus();
    return;
  }
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox" || type === "radio" || type === "button" || type === "submit") {
      el.click();
    } else {
      el.focus();
    }
  }
}

function goBack() {
  // Prefer explicit Cancel / Close when an overlay is open.
  if (document.querySelector(".confirm-backdrop")) {
    const cancelBtn = [
      ...document.querySelectorAll<HTMLElement>(".confirm-dialog button"),
    ].find((b) => /cancel|keep playing/i.test(b.textContent || ""));
    cancelBtn?.click();
    return;
  }
  if (document.querySelector(".game-menu-backdrop")) {
    const closer = [
      ...document.querySelectorAll<HTMLElement>(".game-menu button"),
    ].find((b) => b.textContent?.trim() === "Close");
    closer?.click();
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
  }
}

type PadEdges = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  back: boolean;
};

function readPad(pad: Gamepad, sticky: Map<string, boolean>): PadEdges {
  const axisY = pad.axes[1] ?? 0;
  const axisX = pad.axes[0] ?? 0;
  const stick = (axis: number, key: string, positive: boolean) => {
    const pressed = positive ? axis > AXIS_PRESS : axis < -AXIS_PRESS;
    const released = positive ? axis < AXIS_RELEASE : axis > -AXIS_RELEASE;
    const sk = `${pad.index}:${key}`;
    if (pressed) {
      sticky.set(sk, true);
      return true;
    }
    if (released) sticky.set(sk, false);
    return sticky.get(sk) === true && pressed;
  };
  // Digital axes with hysteresis via sticky map for edge detection elsewhere.
  void stick;
  return {
    up: !!(pad.buttons[12]?.pressed || axisY < -AXIS_PRESS),
    down: !!(pad.buttons[13]?.pressed || axisY > AXIS_PRESS),
    left: !!(pad.buttons[14]?.pressed || axisX < -AXIS_PRESS),
    right: !!(pad.buttons[15]?.pressed || axisX > AXIS_PRESS),
    confirm: !!(pad.buttons[9]?.pressed || pad.buttons[0]?.pressed),
    back: !!(pad.buttons[8]?.pressed || pad.buttons[1]?.pressed),
  };
}

export type LauncherGamepadOptions = {
  /** Disable while the player InputRouter owns the pad (gameplay, not menus). */
  isGameplayActive: () => boolean;
  onPresence?: (state: GamepadPresence, detail?: string) => void;
  /** Prefer pad index; default first connected. */
  preferredIndex?: number | null;
};

/**
 * Bounded rAF poller for launcher focus navigation.
 * Skips entirely while gameplay is active and no overlay is open.
 */
export class LauncherGamepadNav {
  private raf = 0;
  private disposed = false;
  private seen = new Set<string>();
  private sticky = new Map<string, boolean>();
  private known = new Set<number>();
  private presence: GamepadPresence = "unsupported";
  private neutralUntil = 0;
  private preferred: number | null = null;

  constructor(private options: LauncherGamepadOptions) {
    this.preferred = options.preferredIndex ?? null;
    if (typeof window === "undefined") return;
    if (typeof navigator.getGamepads !== "function") {
      this.presence = "unsupported";
      this.options.onPresence?.("unsupported", "Gamepad API unavailable");
      return;
    }
    this.presence = "none";
    window.addEventListener("gamepadconnected", this.onConnect);
    window.addEventListener("gamepaddisconnected", this.onDisconnect);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.scheduleTick();
    this.options.onPresence?.(this.presence);
  }

  /** Require released inputs after opening a menu / changing route. */
  requireNeutral(ms = 180) {
    this.neutralUntil = performance.now() + ms;
    this.seen.clear();
  }

  getPresence() {
    return this.presence;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("gamepadconnected", this.onConnect);
    window.removeEventListener("gamepaddisconnected", this.onDisconnect);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.seen.clear();
    this.sticky.clear();
  }

  private scheduleTick() {
    if (this.disposed) return;
    // Stop polling while the tab is hidden — resume on visibilitychange.
    if (typeof document !== "undefined" && document.hidden) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private onVisibility = () => {
    if (this.disposed) return;
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.seen.clear();
      this.sticky.clear();
      return;
    }
    this.requireNeutral();
    this.scheduleTick();
  };

  private onConnect = (e: Event) => {
    const pad = (e as GamepadEvent).gamepad;
    if (!pad) return;
    this.known.add(pad.index);
    if (this.preferred == null) this.preferred = pad.index;
    this.presence = "connected";
    this.requireNeutral();
    this.options.onPresence?.(
      "connected",
      pad.id ? `Controller connected: ${pad.id}` : "Controller connected",
    );
  };

  private onDisconnect = (e: Event) => {
    const pad = (e as GamepadEvent).gamepad;
    if (pad) this.known.delete(pad.index);
    if (this.preferred === pad?.index) {
      this.preferred = this.known.values().next().value ?? null;
    }
    // Clear any held edge state so reconnect cannot ghost-click.
    this.seen.clear();
    this.sticky.clear();
    this.presence = this.known.size ? "connected" : "disconnected";
    this.options.onPresence?.(
      this.presence,
      pad?.id ? `Controller disconnected: ${pad.id}` : "Controller disconnected",
    );
  };

  private edge(key: string, pressed: boolean): boolean {
    if (!pressed) {
      this.seen.delete(key);
      return false;
    }
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  private tick = () => {
    if (this.disposed) return;
    this.scheduleTick();
    if (typeof document !== "undefined" && document.hidden) return;
    if (typeof navigator.getGamepads !== "function") return;

    // GameMenu has its own Start/Select navigator — avoid duplicate clicks.
    if (document.querySelector(".game-menu-backdrop")) return;

    const overlayOpen = !!activeOverlayRoot();
    const gameplay = this.options.isGameplayActive();
    // During pure gameplay without overlays, InputRouter owns the pad.
    if (gameplay && !overlayOpen) return;
    if (performance.now() < this.neutralUntil) {
      // Drain edges while waiting for neutral so held buttons don't fire later.
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        readPad(pad, this.sticky);
      }
      this.seen.clear();
      return;
    }

    const pads = navigator.getGamepads();
    let active: Gamepad | null = null;
    if (this.preferred != null) active = pads[this.preferred] || null;
    if (!active) {
      for (const p of pads) {
        if (p) {
          active = p;
          break;
        }
      }
    }
    if (!active) return;

    const state = readPad(active, this.sticky);
    const id = active.index;
    if (this.edge(`${id}:up`, state.up)) moveFocus("up");
    if (this.edge(`${id}:down`, state.down)) moveFocus("down");
    if (this.edge(`${id}:left`, state.left)) moveFocus("left");
    if (this.edge(`${id}:right`, state.right)) moveFocus("right");
    if (this.edge(`${id}:confirm`, state.confirm)) activateFocused();
    if (this.edge(`${id}:back`, state.back)) goBack();
  };
}
