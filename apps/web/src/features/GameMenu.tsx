"use client";
import { useEffect, useId, useRef } from "react";
import type { RuntimeCapabilities } from "@/emulators/contracts";

export type GameMenuAction =
  | "resume"
  | "pause"
  | "restart"
  | "quick-save"
  | "quick-load"
  | "save-slot"
  | "load-slot"
  | "export"
  | "import"
  | "fullscreen"
  | "touch-toggle"
  | "touch-edit"
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
  volume,
  slot,
  touchVisible,
  editingTouch,
  onClose,
  onAction,
  onVolume,
  onSlot,
  onImportFile,
}: {
  open: boolean;
  paused: boolean;
  caps: RuntimeCapabilities;
  volume: number;
  slot: number;
  touchVisible: boolean;
  editingTouch: boolean;
  onClose: () => void;
  onAction: (action: GameMenuAction) => void;
  onVolume: (value: number) => void;
  onSlot: (slot: number) => void;
  onImportFile: (file: File) => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel ? focusableIn(panel) : [];
    // Prefer Close / Resume over destructive Exit as initial focus.
    const preferred =
      focusables.find((el) => el.textContent?.trim() === "Close") ||
      focusables[0];
    preferred?.focus();

    const onKey = (e: KeyboardEvent) => {
      // Escape is owned by Player (and ConfirmDialog when nested).
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
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      returnFocus.current?.focus?.();
    };
  }, [open]);

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

        {caps.audio && (
          <label className="game-menu-row">
            Volume
            <input
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolume(+e.target.value)}
            />
          </label>
        )}

        {caps.saveState && (
          <div className="game-menu-saves">
            <h3>Save slots</h3>
            <label className="game-menu-row">
              Slot
              <select
                aria-label="Save slot"
                value={slot}
                onChange={(e) => onSlot(+e.target.value)}
              >
                {[0, 1, 2, 3, 9].map((n) => (
                  <option key={n} value={n}>
                    {n === 9
                      ? "Autosave"
                      : n === 0
                        ? "Quick / Slot 1"
                        : `Slot ${n + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="game-menu-grid compact">
              <button type="button" onClick={() => onAction("save-slot")}>
                Save to slot
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onAction("load-slot")}
              >
                Load slot
              </button>
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
              States are tied to this game and core version. Autosave uses the
              autosave slot every 30 seconds when supported.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
