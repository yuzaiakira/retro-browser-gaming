"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { db, setting, setSetting } from "@/lib/db";
import { assetFile } from "@/lib/storage";
import { auditInstallation } from "./offline";
import { createAdapter } from "@/emulators/registry";
import { loadLaunchMedia } from "@/emulators/media";
import type { EmulatorAdapter } from "@/emulators/contracts";
import type { Installation } from "@/lib/types";
import { defaultKeys, InputRouter } from "./input";
import TouchControls from "./TouchControls";
import { exportSave, importSave, readSave, storeSave } from "./saves";
import { isMissingRuntimeError, missingRuntimeMessage } from "./runtime-errors";
import GameMenu, { type GameMenuAction } from "./GameMenu";
import ConfirmDialog from "./ConfirmDialog";

const QUICK_SLOT = 0;
const AUTOSAVE_SLOT = 9;

type ConfirmKind = "restart" | "load" | "exit" | null;

export default function Player({ id }: { id: string }) {
  const [installation, setInstallation] = useState<Installation>();
  const [message, setMessage] = useState("Checking local game integrity…");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const [edit, setEdit] = useState(false);
  const [router, setRouter] = useState<InputRouter | null>(null);
  const [caps, setCaps] = useState({
    saveState: false,
    audio: false,
    analog: false,
  });
  const [slot, setSlot] = useState(QUICK_SLOT);
  const [volume, setVolume] = useState(0.4);
  const [sessionDirty, setSessionDirty] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pendingLoadSlot, setPendingLoadSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const adapter = useRef<EmulatorAdapter | null>(null);
  const local = useRef<Installation | undefined>(undefined);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const routerRef = useRef<InputRouter | null>(null);
  const pausedRef = useRef(false);
  const busyRef = useRef(false);
  const autosavingRef = useRef(false);
  const disposedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const setStatus = useCallback((text: string) => {
    if (disposedRef.current) return;
    setMessage(text);
  }, []);

  const flashToast = useCallback((text: string) => {
    if (disposedRef.current) return;
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      if (!disposedRef.current) setToast(null);
    }, 2200);
  }, []);

  const markDirty = useCallback(() => {
    if (disposedRef.current) return;
    setSessionDirty(true);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    setTouch(navigator.maxTouchPoints > 0);
    disposedRef.current = false;
    let disposed = false;
    let input: InputRouter | undefined;
    let runtime: EmulatorAdapter | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const item = await (await db()).get("installations", id);
      if (!item)
        throw new Error(
          "Game is not installed. Open the catalog to download it.",
        );
      if (!(await auditInstallation(item))) {
        await (await db()).put("installations", { ...item, state: "missing" });
        throw new Error(
          "Local game/core data is missing or damaged. Reinstall from the catalog.",
        );
      }
      if (disposed) return;
      local.current = item;
      setInstallation(item);
      setMessage("Starting the local runtime…");
      runtime = createAdapter(host.current!, item.release);
      adapter.current = runtime;
      const media = await loadLaunchMedia(item.manifest, assetFile);
      const biosAsset = item.manifest.assets.find((a) => a.role === "bios");
      const bios = biosAsset ? await assetFile(biosAsset) : undefined;
      await runtime.load(media.entry, {
        core: item.manifest.core.code,
        name: item.manifest.entryFile,
        bios,
        companions: media.companions,
      });
      if (disposed) {
        runtime.dispose();
        return;
      }
      if (
        item.manifest.core.code === "js2me" &&
        typeof runtime.importRmsMigration === "function"
      ) {
        try {
          const { j2meDedicatedEnabled, j2meRuntimeOrigin } = await import(
            "@/emulators/j2me-origin"
          );
          if (j2meDedicatedEnabled()) {
            const {
              buildMigrationPayload,
              discoverLauncherRmsSuites,
              migrationMetaPut,
            } = await import("@/features/j2me-rms-migrate");
            const suites = await discoverLauncherRmsSuites();
            if (suites.length) {
              await runtime.importRmsMigration!(
                buildMigrationPayload(suites, false),
              );
              const target = j2meRuntimeOrigin() || "dedicated";
              for (const suite of suites) {
                await migrationMetaPut(suite.midletId, {
                  status: "migrated",
                  at: Date.now(),
                  byteSize: suite.byteSize,
                  targetOrigin: target,
                });
              }
            }
          }
        } catch (error) {
          if (!disposed)
            setMessage(
              "RMS migration deferred: " +
                String(error instanceof Error ? error.message : error),
            );
        }
      }
      await runtime.start();
      input = new InputRouter((c, v) => {
        runtime!.input(c, v);
        if (v !== 0) markDirty();
      }, await setting("keymap", defaultKeys));
      routerRef.current = input;
      setRouter(input);
      setCaps(runtime.capabilities);
      setRunning(true);
      // New session: treat as dirty only when save-states exist (exit risk).
      setSessionDirty(runtime.capabilities.saveState);
      setMessage("Playing on this device");
      await setSetting("recent:" + id, Date.now());
      if (runtime.capabilities.saveState) {
        interval = setInterval(() => {
          void (async () => {
            if (
              disposed ||
              disposedRef.current ||
              autosavingRef.current ||
              busyRef.current ||
              pausedRef.current
            ) {
              return;
            }
            const current = adapter.current;
            const install = local.current;
            if (!current || !install) return;
            autosavingRef.current = true;
            try {
              await storeSave(
                install,
                await current.exportState(),
                AUTOSAVE_SLOT,
              );
              if (!disposed && !disposedRef.current) {
                setSessionDirty(false);
              }
            } catch (error) {
              if (!disposed && !disposedRef.current) {
                setMessage(
                  "Autosave unavailable: " +
                    String(error instanceof Error ? error.message : error),
                );
              }
            } finally {
              autosavingRef.current = false;
            }
          })();
        }, 30000);
      }
    })().catch((error) => {
      if (disposed) return;
      const raw = String(error instanceof Error ? error.message : error);
      setMessage(isMissingRuntimeError(raw) ? missingRuntimeMessage(raw) : raw);
    });
    return () => {
      disposed = true;
      disposedRef.current = true;
      clearInterval(interval);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      input?.dispose();
      routerRef.current = null;
      runtime?.dispose();
      adapter.current = null;
    };
  }, [id, markDirty]);

  // Suspend gameplay input for overlays / pause / layout editing.
  useEffect(() => {
    const block = menuOpen || !!confirm || edit || paused;
    router?.setSuspended(block);
  }, [menuOpen, confirm, edit, paused, router]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Topmost dialog owns Escape — confirms take priority over the game menu.
      if (confirm) return;
      e.preventDefault();
      e.stopPropagation();
      if (menuOpen) {
        setMenuOpen(false);
        menuBtn.current?.focus();
      } else if (!edit) {
        setMenuOpen(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [running, menuOpen, confirm, edit]);

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busyRef.current) {
      setStatus("Please wait — another action is in progress");
      return undefined;
    }
    busyRef.current = true;
    try {
      return await fn();
    } finally {
      busyRef.current = false;
    }
  }

  async function persistSlot(target: number, label: string) {
    if (!local.current || !adapter.current)
      throw new Error("Runtime unavailable");
    if (!caps.saveState) throw new Error("Save states unsupported for this core");
    if (autosavingRef.current) {
      setStatus("Autosave in progress — try again in a moment");
      return;
    }
    setSaving(true);
    setStatus("Saving…");
    try {
      await storeSave(
        local.current,
        await adapter.current.exportState(),
        target,
      );
      if (disposedRef.current) return;
      setSessionDirty(false);
      setStatus(label);
      flashToast(label);
    } catch (error) {
      if (disposedRef.current) return;
      const msg =
        "Save failed: " +
        String(error instanceof Error ? error.message : error);
      setStatus(msg);
      flashToast(msg);
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function restoreSlot(target: number) {
    if (!local.current || !adapter.current)
      throw new Error("Runtime unavailable");
    if (!caps.saveState) throw new Error("Save states unsupported for this core");
    setStatus("Restoring…");
    const saved = await readSave(local.current, target);
    await adapter.current.importState(saved.bytes);
    if (disposedRef.current) return;
    // Keep UI pause state consistent with the adapter after load.
    if (pausedRef.current) {
      await adapter.current.pause().catch(() => undefined);
    } else {
      await adapter.current.resume().catch(() => undefined);
    }
    setSessionDirty(false);
    setStatus("Restored successfully");
    flashToast("Restored successfully");
  }

  async function togglePause() {
    await withBusy(async () => {
      if (!adapter.current) return;
      if (paused) {
        await adapter.current.resume();
        if (disposedRef.current) return;
        setPaused(false);
        setStatus("Resumed");
      } else {
        await adapter.current.pause();
        if (disposedRef.current) return;
        setPaused(true);
        setStatus("Paused");
      }
    });
  }

  async function doRestart() {
    await withBusy(async () => {
      if (!adapter.current) return;
      try {
        await adapter.current.reset();
        // reset() does not guarantee resume — always resume to match Playing UI.
        await adapter.current.resume();
        if (disposedRef.current) return;
        setPaused(false);
        setSessionDirty(caps.saveState);
        setStatus("Game reset");
        flashToast("Game reset");
        setMenuOpen(false);
      } catch (error) {
        if (disposedRef.current) return;
        setStatus(
          "Reset failed: " +
            String(error instanceof Error ? error.message : error),
        );
      }
    });
  }

  async function doFullscreen() {
    const node = shell.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setStatus("Exited fullscreen");
    } else {
      await node.requestFullscreen();
      setStatus("Fullscreen");
    }
  }

  function requestExit() {
    if (sessionDirty && caps.saveState) setConfirm("exit");
    else window.location.href = "/library";
  }

  async function handleMenuAction(action: GameMenuAction) {
    try {
      switch (action) {
        case "resume":
        case "pause":
          await togglePause();
          if (action === "resume") setMenuOpen(false);
          break;
        case "restart":
          setConfirm("restart");
          break;
        case "quick-save":
          await withBusy(() =>
            persistSlot(QUICK_SLOT, "Quick save stored"),
          );
          break;
        case "quick-load":
          setPendingLoadSlot(QUICK_SLOT);
          setConfirm("load");
          break;
        case "save-slot":
          await withBusy(() =>
            persistSlot(
              slot,
              slot === AUTOSAVE_SLOT
                ? "Autosave slot stored"
                : `Slot ${slot + 1} stored`,
            ),
          );
          break;
        case "load-slot":
          setPendingLoadSlot(slot);
          setConfirm("load");
          break;
        case "export": {
          if (!installation) break;
          const blob = await exportSave(installation, slot);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${installation.game.slug}-slot${slot}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus("Backup exported");
          break;
        }
        case "import":
          break;
        case "fullscreen":
          await doFullscreen();
          break;
        case "touch-toggle":
          setTouch((v) => !v);
          if (touch) setEdit(false);
          setMenuOpen(false);
          break;
        case "touch-edit":
          setTouch(true);
          setEdit(true);
          setMenuOpen(false);
          break;
        case "exit":
          requestExit();
          break;
      }
    } catch (error) {
      setStatus(String(error instanceof Error ? error.message : error));
    }
  }

  return (
    <section
      className="player-shell"
      ref={shell}
      data-paused={paused || undefined}
      data-menu={menuOpen || confirm ? "open" : undefined}
      data-editing={edit || undefined}
    >
      <header className="player-hud">
        <div className="player-hud-text">
          <span className="eyebrow">
            {installation?.release.console.name ?? "LOCAL"} ·{" "}
            {paused ? "PAUSED" : running ? "PLAYING" : "LOADING"}
          </span>
          <h1 className="player-title">
            {installation?.game.title ?? "Opening your game"}
          </h1>
        </div>
        <div className="player-hud-actions">
          {running && caps.saveState && (
            <>
              <button
                type="button"
                className="secondary hud-btn"
                disabled={saving || busyRef.current}
                title="Store progress to the quick-save slot"
                onClick={() =>
                  void handleMenuAction("quick-save").catch(() => {})
                }
              >
                Quick save
              </button>
              <button
                type="button"
                className="secondary hud-btn"
                title="Restore the quick-save slot"
                onClick={() =>
                  void handleMenuAction("quick-load").catch(() => {})
                }
              >
                Quick load
              </button>
            </>
          )}
          {running && (
            <button
              type="button"
              className="secondary hud-btn"
              onClick={() => void togglePause()}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
          <button
            ref={menuBtn}
            type="button"
            className="hud-btn"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            title="Open game menu"
            onClick={() => setMenuOpen(true)}
            disabled={!running}
          >
            Menu
          </button>
          <a
            className="button secondary hud-btn"
            href="/library"
            onClick={(e) => {
              if (sessionDirty && caps.saveState) {
                e.preventDefault();
                requestExit();
              }
            }}
          >
            Library
          </a>
        </div>
      </header>

      <p role="status" className="player-status" aria-live="polite">
        {message}
      </p>

      <div className="player-viewport">
        <div className="player-stage" ref={host} />
        {running && touch && (
          <TouchControls
            router={router}
            system={installation!.release.console.slug}
            edit={edit}
            analog={caps.analog}
            overlay
            blocked={menuOpen || !!confirm}
            onEditCancel={() => setEdit(false)}
          />
        )}
        {paused && !menuOpen && !confirm && (
          <div className="player-paused-badge" aria-hidden="true">
            Paused
          </div>
        )}
        {toast && (
          <div className="player-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </div>

      <GameMenu
        open={menuOpen && !confirm}
        paused={paused}
        caps={caps}
        volume={volume}
        slot={slot}
        touchVisible={touch}
        editingTouch={edit}
        onClose={() => {
          setMenuOpen(false);
          menuBtn.current?.focus();
        }}
        onAction={(a) => void handleMenuAction(a)}
        onVolume={(value) => {
          setVolume(value);
          void adapter.current?.setVolume(value).then(
            () => setStatus("Volume updated"),
            (error) =>
              setStatus(
                String(error instanceof Error ? error.message : error),
              ),
          );
        }}
        onSlot={setSlot}
        onImportFile={(file) => {
          if (!installation) return;
          void importSave(installation, file)
            .then(() =>
              setStatus("Backup imported; use Load slot to restore."),
            )
            .catch((error) =>
              setStatus(String(error instanceof Error ? error.message : error)),
            );
        }}
      />

      <ConfirmDialog
        open={confirm === "restart"}
        title="Restart game?"
        message="Unsaved progress in this session may be lost. Saved slots stay on this device."
        confirmLabel="Restart"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void doRestart();
        }}
      />
      <ConfirmDialog
        open={confirm === "load"}
        title="Load save state?"
        message="Loading replaces the current session. Quick save first if you want to keep it."
        confirmLabel="Load"
        danger
        onCancel={() => {
          setConfirm(null);
          setPendingLoadSlot(null);
        }}
        onConfirm={() => {
          const target = pendingLoadSlot ?? slot;
          setConfirm(null);
          setPendingLoadSlot(null);
          void withBusy(() =>
            restoreSlot(target).then(() => {
              if (!disposedRef.current) setMenuOpen(false);
            }),
          ).catch((error) =>
            setStatus(String(error instanceof Error ? error.message : error)),
          );
        }}
      />
      <ConfirmDialog
        open={confirm === "exit"}
        title="Leave this game?"
        message="You may have unsaved session progress. Quick save is available from the menu."
        confirmLabel="Exit to library"
        cancelLabel="Keep playing"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          window.location.href = "/library";
        }}
      />
    </section>
  );
}
