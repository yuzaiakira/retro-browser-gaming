/**
 * Container-level display helpers for PlayerShell.
 *
 * The EmulatorAdapter has no display-mode API — these styles only affect the
 * iframe host (`.player-stage`), never remount the frame, and never claim
 * pixel-perfect integer scaling without native framebuffer dimensions.
 */

import type { DisplayMode, RenderFilter } from "./player-prefs";

export type AspectSource = "documented-fallback" | "default-4-3";

export type AspectInfo = {
  /** CSS aspect-ratio value, e.g. "4 / 3" */
  css: string;
  ratio: number;
  source: AspectSource;
  label: string;
};

/**
 * Documented aspect fallbacks by console slug — NOT measured native resolution.
 * Used only for shell letterboxing. Unknown systems fall back to 4:3.
 */
const DOCUMENTED_ASPECT: Record<string, { w: number; h: number; note: string }> =
  {
    nes: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    snes: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    genesis: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    "mega-drive": { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    mastersystem: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    gamegear: { w: 10, h: 9, note: "Handheld approximate (documented fallback)" },
    gb: { w: 10, h: 9, note: "Handheld approximate (documented fallback)" },
    gbc: { w: 10, h: 9, note: "Handheld approximate (documented fallback)" },
    gba: { w: 3, h: 2, note: "GBA approximate (documented fallback)" },
    nds: { w: 4, h: 3, note: "Dual-screen shell uses 4:3 (documented fallback)" },
    psx: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    psp: { w: 16, h: 9, note: "PSP approximate 16:9 (documented fallback)" },
    msx: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    amiga: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    cpc: { w: 4, h: 3, note: "Classic TV 4:3 (documented fallback)" },
    dos: { w: 4, h: 3, note: "Classic PC 4:3 (documented fallback)" },
    browser: { w: 4, h: 3, note: "HTML5 shell default 4:3 (documented fallback)" },
    html5: { w: 4, h: 3, note: "HTML5 shell default 4:3 (documented fallback)" },
    j2me: { w: 3, h: 4, note: "Portrait phone approximate (documented fallback)" },
  };

export function aspectForConsole(slug: string | undefined | null): AspectInfo {
  const key = (slug || "").toLowerCase();
  const hit = DOCUMENTED_ASPECT[key];
  if (hit) {
    return {
      css: `${hit.w} / ${hit.h}`,
      ratio: hit.w / hit.h,
      source: "documented-fallback",
      label: hit.note,
    };
  }
  return {
    css: "4 / 3",
    ratio: 4 / 3,
    source: "default-4-3",
    label: "Default 4:3 (no console-specific documented ratio)",
  };
}

/** Integer scaling requires trusted framebuffer size from the runtime — unavailable. */
export function integerScalingSupport(): {
  supported: boolean;
  reason: string;
} {
  return {
    supported: false,
    reason:
      "Integer scaling needs trusted native framebuffer dimensions from the emulator. This runtime does not expose them, so the option stays disabled.",
  };
}

export function stageStyle(
  mode: DisplayMode,
  aspect: AspectInfo,
): { aspectRatio: string; width: string; maxHeight: string; maxWidth: string } {
  // Both modes preserve the documented aspect via CSS. Fit maximizes within the
  // viewport; original uses the same ratio with a slightly more conservative width
  // so letterboxing stays visible on wide screens.
  if (mode === "original") {
    return {
      aspectRatio: aspect.css,
      width: "min(92%, calc(62vh * " + aspect.ratio + "))",
      maxHeight: "min(100%, 62vh)",
      maxWidth: "100%",
    };
  }
  return {
    aspectRatio: aspect.css,
    width: "min(100%, calc(70vh * " + aspect.ratio + "))",
    maxHeight: "100%",
    maxWidth: "100%",
  };
}

/** Applied only to `.player-stage iframe` — never the HUD or page chrome. */
export function iframeImageRendering(
  filter: RenderFilter,
): "auto" | "pixelated" | "smooth" {
  if (filter === "sharp") return "pixelated";
  if (filter === "smooth") return "smooth";
  return "auto";
}
