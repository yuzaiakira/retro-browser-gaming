"use client";
import { useEffect, useId, useRef } from "react";
import type { RuntimeCapabilities } from "@/emulators/contracts";
import type { DisplayMode, PlayerPrefs, RenderFilter } from "./player-prefs";
import { DEFAULT_SHORTCUTS } from "./player-prefs";
import {
  formatShortcutCode,
  shortcutLabel,
} from "./player-shortcuts";
import type { AspectInfo } from "./player-display";
import { integerScalingSupport } from "./player-display";
import type { SaveSlotInfo } from "./save-slots";
import { canLoadSlot } from "./save-slots";

export type GameMenuAction =
  | "resume"
  | "pause"
  | "restart"
  | "quick-save"
  | "quick-load"
  | "save-slot"
  | "load-slot"
  | "load-last"
  | "export"
  | "import"
  | "fullscreen"
  | "touch-toggle"
  | "touch-edit"
  | "hud-toggle"
  | "reset-prefs"
  | "exit";

function focusableIn(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

export default function GameMenu({
  open,
  paused,
  caps,
  prefs,
  aspect,
  slot,
  slots,
  latestSlot,
  touchVisible,
  editingTouch,
  hudMinimized,
  onClose,
  onAction,
  onPrefsPatch,
  onSlot,
  onImportFile,
}: {
  open: boolean;
  paused: boolean;
  caps: RuntimeCapabilities;
  prefs: PlayerPrefs;
  aspect: AspectInfo;
  slot: number;
  slots: SaveSlotInfo[];
  latestSlot: SaveSlotInfo | null;
  touchVisible: boolean;
  editingTouch: boolean;
  hudMinimized: boolean;
  onClose: () => void;
  onAction: (action: GameMenuAction) => void;
  onPrefsPatch: (patch: Partial<PlayerPrefs>) => void;
  onSlot: (slot: number) => void;
  onImportFile: (file: File) => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const integer = integerScalingSupport();

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel ? focusableIn(panel) : [];
    const preferred =
      focusables.find((el) => el.textContent?.trim() === "Close") ||
      focusables[0];
    preferred?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const list = focusableIn(panel);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Simulated gamepad menu navigation (not physical verification).
    let raf = 0;
    const seen = new Set<string>();
    const pollPad = () => {
      if (!navigator.getGamepads) {
        raf = requestAnimationFrame(pollPad);
        return;
      }
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        const up = pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.5;
        const down = pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.5;
        // Start confirms; Select backs out. Do NOT use face button A (0) —
        // gameplay tests hold A while the menu is open and InputRouter must
        // stay suspended for the whole overlay lifetime.
        const confirm = pad.buttons[9]?.pressed;
        const back = pad.buttons[8]?.pressed;
        const move = (dir: -1 | 1, key: string) => {
          if (!up && !down) {
            seen.delete(key);
            return;
          }
          const active = dir < 0 ? up : down;
          if (!active) {
            seen.delete(key);
            return;
          }
          if (seen.has(key)) return;
          seen.add(key);
          const list = panel ? focusableIn(panel) : [];
          if (!list.length) return;
          const idx = list.indexOf(document.activeElement as HTMLElement);
          const next = list[(idx + dir + list.length) % list.length];
          next?.focus();
        };
        move(-1, `${pad.index}:up`);
        move(1, `${pad.index}:down`);
        if (confirm) {
          const k = `${pad.index}:a`;
          if (!seen.has(k)) {
            seen.add(k);
            (document.activeElement as HTMLElement | null)?.click?.();
          }
        } else seen.delete(`${pad.index}:a`);
        if (back) {
          const k = `${pad.index}:b`;
          if (!seen.has(k)) {
            seen.add(k);
            onClose();
          }
        } else seen.delete(`${pad.index}:b`);
      }
      raf = requestAnimationFrame(pollPad);
    };
    raf = requestAnimationFrame(pollPad);

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="game-menu-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="game-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="game-menu-head">
          <h2 id={titleId}>Game menu</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="game-menu-grid">
          <button
            type="button"
            onClick={() => onAction(paused ? "resume" : "pause")}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onAction("restart")}
          >
            Restart
          </button>
          {caps.saveState && (
            <>
              <button type="button" onClick={() => onAction("quick-save")}>
                Quick save
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onAction("quick-load")}
              >
                Quick load
              </button>
            </>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => onAction("fullscreen")}
          >
            Fullscreen
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onAction("hud-toggle")}
          >
            {hudMinimized ? "Show full HUD" : "Minimize HUD"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onAction("touch-toggle")}
          >
            {touchVisible ? "Hide touch controls" : "Show touch controls"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onAction("touch-edit")}
          >
            {editingTouch ? "Finish control edit" : "Edit touch controls"}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => onAction("exit")}
          >
            Exit to library
          </button>
        </div>

        <div className="game-menu-section">
          <h3>Display</h3>
          <p className="small">
            Container-only — does not remount the emulator. Aspect: {aspect.label}.
          </p>
          <label className="game-menu-row">
            Display mode
            <select
              aria-label="Display mode"
              value={prefs.displayMode}
              onChange={(e) =>
                onPrefsPatch({ displayMode: e.target.value as DisplayMode })
              }
            >
              <option value="fit">Fit (maximize, keep ratio)</option>
              <option value="original">Original aspect (documented ratio)</option>
              <option disabled>
                Integer scaling (unavailable)
              </option>
            </select>
          </label>
          <p className="small" role="note">
            {integer.reason}
          </p>
          <label className="game-menu-row">
            Frame scaling
            <select
              aria-label="Frame scaling filter"
              value={prefs.renderFilter}
              onChange={(e) =>
                onPrefsPatch({
                  renderFilter: e.target.value as RenderFilter,
                })
              }
            >
              <option value="auto">Browser default</option>
              <option value="sharp">Sharp (nearest / pixelated on iframe)</option>
              <option value="smooth">Smooth</option>
            </select>
          </label>
        </div>

        {caps.audio && (
          <label className="game-menu-row">
            Volume
            <input
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={prefs.volume}
              onChange={(e) => onPrefsPatch({ volume: +e.target.value })}
            />
          </label>
        )}

        <div className="game-menu-section">
          <h3>Shortcuts</h3>
          <label className="game-menu-row row-inline">
            <span>Enable player shortcuts</span>
            <input
              type="checkbox"
              checked={prefs.shortcutsEnabled}
              onChange={(e) =>
                onPrefsPatch({ shortcutsEnabled: e.target.checked })
              }
            />
          </label>
          <ul className="shortcut-list">
            {(Object.keys(DEFAULT_SHORTCUTS) as (keyof typeof DEFAULT_SHORTCUTS)[]).map(
              (action) => (
                <li key={action}>
                  <span>{shortcutLabel(action)}</span>
                  <kbd>{formatShortcutCode(prefs.shortcuts[action])}</kbd>
                </li>
              ),
            )}
          </ul>
          <p className="small">
            Customize or disable shortcuts in Settings. Shortcuts never reach the
            emulator as gameplay input.
          </p>
        </div>

        {caps.saveState && (
          <div className="game-menu-saves">
            <h3>Save manager</h3>
            {latestSlot && canLoadSlot(latestSlot) && (
              <button
                type="button"
                className="secondary"
                onClick={() => onAction("load-last")}
              >
                Load last save ({latestSlot.label})
              </button>
            )}
            <ul className="save-slot-list" aria-label="Save slots">
              {slots.map((info) => (
                <li
                  key={info.slot}
                  data-status={info.status}
                  className={slot === info.slot ? "selected" : undefined}
                >
                  <button
                    type="button"
                    className="text-button slot-pick"
                    aria-label={`Choose save slot ${info.slot} (${info.status})`}
                    onClick={() => onSlot(info.slot)}
                  >
                    <strong aria-hidden="true">{info.label}</strong>
                    <span aria-hidden="true">{info.detail}</span>
                  </button>
                  <div className="slot-actions">
                    <button
                      type="button"
                      disabled={!canLoadSlot(info)}
                      title={
                        canLoadSlot(info)
                          ? "Load this slot"
                          : info.status === "empty"
                            ? "Empty slot"
                            : info.detail
                      }
                      onClick={() => {
                        onSlot(info.slot);
                        onAction("load-slot");
                      }}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        onSlot(info.slot);
                        onAction("save-slot");
                      }}
                    >
                      Save
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="game-menu-grid compact">
              <button
                type="button"
                className="secondary"
                onClick={() => onAction("export")}
              >
                Export backup
              </button>
              <label className="button secondary file-label">
                Import backup
                <input
                  className="file-input"
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportFile(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <p className="small">
              States are tied to this game and core version. Autosave uses slot
              9 every 30 seconds when supported. Empty or corrupt slots cannot
              load.
            </p>
          </div>
        )}

        <button
          type="button"
          className="secondary"
          onClick={() => onAction("reset-prefs")}
        >
          Reset this game’s preferences
        </button>
      </div>
    </div>
  );
}
