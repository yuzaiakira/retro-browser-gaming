"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, setSetting } from "@/lib/db";
import { assetFile } from "@/lib/storage";
import { auditInstallation } from "./offline";
import { createAdapter } from "@/emulators/registry";
import { loadLaunchMedia } from "@/emulators/media";
import type { EmulatorAdapter } from "@/emulators/contracts";
import type { Installation } from "@/lib/types";
import { InputRouter } from "./input";
import TouchControls from "./TouchControls";
import { exportSave, importSave, readSave, storeSave } from "./saves";
import { isMissingRuntimeError, missingRuntimeMessage } from "./runtime-errors";
import GameMenu, { type GameMenuAction } from "./GameMenu";
import ConfirmDialog from "./ConfirmDialog";
import {
  DEFAULT_PLAYER_PREFS,
  mergePlayerPrefs,
  resolveTouchVisible,
  shellShortcutCodes,
  type PlayerPrefs,
  type PlayerPrefsPatch,
} from "./player-prefs";
import {
  clearReleasePrefs,
  loadEffectiveKeymap,
  loadEffectivePrefs,
  patchReleasePrefs,
} from "./player-prefs-store";
import {
  aspectForConsole,
  iframeImageRendering,
  stageStyle,
} from "./player-display";
import {
  matchShortcut,
  uiBlocksShortcuts,
} from "./player-shortcuts";
import {
  AUTOSAVE_SLOT,
  canLoadSlot,
  findLatestCompatibleSave,
  listSaveSlots,
  type SaveSlotInfo,
} from "./save-slots";

const QUICK_SLOT = 0;

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
  const [prefs, setPrefs] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [latestSlot, setLatestSlot] = useState<SaveSlotInfo | null>(null);
  const [sessionDirty, setSessionDirty] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pendingLoadSlot, setPendingLoadSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [iframeEpoch] = useState(0); // remount detector for tests — never increment on prefs
  const [runtimeSession, setRuntimeSession] = useState<string | null>(null);

  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const adapter = useRef<EmulatorAdapter | null>(null);
  const local = useRef<Installation | undefined>(undefined);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const floatMenuBtn = useRef<HTMLButtonElement>(null);
  const routerRef = useRef<InputRouter | null>(null);
  const prefsRef = useRef(prefs);
  const pausedRef = useRef(false);
  const busyRef = useRef(false);
  const autosavingRef = useRef(false);
  const disposedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const handleShortcutRef = useRef<(action: string) => void>(() => undefined);

  prefsRef.current = prefs;

  const aspect = useMemo(
    () => aspectForConsole(installation?.release.console.slug),
    [installation?.release.console.slug],
  );
  const stage = useMemo(
    () => stageStyle(prefs.displayMode, aspect),
    [prefs.displayMode, aspect],
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

  const refreshSlots = useCallback(async () => {
    const item = local.current;
    if (!item || !item.manifest?.core) return;
    try {
      const list = await listSaveSlots(item);
      const latest = await findLatestCompatibleSave(item);
      if (disposedRef.current) return;
      setSlots(list);
      setLatestSlot(latest);
    } catch {
      /* ignore listing errors during boot */
    }
  }, []);

  const syncShellKeys = useCallback(async (next: PlayerPrefs) => {
    const runtime = adapter.current;
    if (!runtime?.setShellShortcutCodes) return;
    try {
      await runtime.setShellShortcutCodes(shellShortcutCodes(next));
    } catch {
      /* frame may not support setShellKeys yet during boot */
    }
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const hasTouch = navigator.maxTouchPoints > 0;
    disposedRef.current = false;
    let disposed = false;
    let input: InputRouter | undefined;
    let runtime: EmulatorAdapter | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const [item, effectivePrefs, keymap] = await Promise.all([
        (await db()).get("installations", id),
        loadEffectivePrefs(id),
        loadEffectiveKeymap(id),
      ]);
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
      setPrefs(effectivePrefs);
      prefsRef.current = effectivePrefs;
      setTouch(resolveTouchVisible(effectivePrefs.touchVisible, hasTouch));
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
      if (runtime.capabilities.audio) {
        await runtime.setVolume(effectivePrefs.volume).catch(() => undefined);
      }
      if (runtime.runtimeSessionId) {
        setRuntimeSession(runtime.runtimeSessionId());
      }
      runtime.setShellKeyHandler?.((detail) => {
        if (disposedRef.current) return;
        if (uiBlocksShortcuts()) return;
        const action = matchShortcut(
          {
            code: detail.code,
            key: detail.key,
            metaKey: false,
            ctrlKey: false,
            altKey: false,
            repeat: false,
          } as KeyboardEvent,
          prefsRef.current.shortcuts,
          prefsRef.current.shortcutsEnabled,
        );
        if (!action) return;
        handleShortcutRef.current(action);
      });
      await runtime
        .setShellShortcutCodes?.(shellShortcutCodes(effectivePrefs))
        .catch(() => undefined);
      input = new InputRouter((c, v) => {
        runtime!.input(c, v);
        if (v !== 0) markDirty();
      }, keymap);
      routerRef.current = input;
      setRouter(input);
      setCaps(runtime.capabilities);
      await setSetting("recent:" + id, Date.now());
      if (disposed || disposedRef.current) return;
      setRunning(true);
      setSessionDirty(runtime.capabilities.saveState);
      setMessage("Playing on this device");
      await refreshSlots();
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
                flashToast("Autosave stored");
                await refreshSlots();
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
      runtime?.setShellKeyHandler?.(null);
      runtime?.dispose();
      adapter.current = null;
      setRuntimeSession(null);
    };
  }, [id, markDirty, refreshSlots, flashToast]);

  useEffect(() => {
    const block = menuOpen || !!confirm || edit || paused;
    router?.setSuspended(block);
  }, [menuOpen, confirm, edit, paused, router]);

  // Apply display styles to stage without remounting the iframe.
  useEffect(() => {
    const stageEl = host.current;
    if (!stageEl) return;
    stageEl.style.aspectRatio = stage.aspectRatio;
    stageEl.style.width = stage.width;
    stageEl.style.maxHeight = stage.maxHeight;
    stageEl.style.maxWidth = stage.maxWidth;
    const iframe = stageEl.querySelector("iframe");
    if (iframe) {
      iframe.style.imageRendering = iframeImageRendering(prefs.renderFilter);
    }
  }, [stage, prefs.renderFilter, running, iframeEpoch]);

  useEffect(() => {
    if (!running) return;

    const dispatchShortcut = (action: string) => {
      if (confirm) return;
      if (edit) return;
      if (action === "menu") {
        setMenuOpen((open) => {
          if (open) {
            queueMicrotask(() => {
              (prefsRef.current.hudMinimized
                ? floatMenuBtn.current
                : menuBtn.current
              )?.focus();
            });
            return false;
          }
          return true;
        });
        return;
      }
      if (menuOpen) return;
      if (action === "pause") void togglePause();
      if (action === "fullscreen") void doFullscreen();
      if (action === "quickSave" && caps.saveState)
        void handleMenuAction("quick-save");
      if (action === "quickLoad" && caps.saveState)
        void handleMenuAction("quick-load");
    };
    handleShortcutRef.current = dispatchShortcut;

    const onKey = (e: KeyboardEvent) => {
      if (uiBlocksShortcuts()) return;
      if (confirm) return;
      if (edit) return;

      const action = matchShortcut(
        e,
        prefsRef.current.shortcuts,
        prefsRef.current.shortcutsEnabled,
      );
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();
      dispatchShortcut(action);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // togglePause/handleMenuAction are stable enough via refs for this session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, menuOpen, confirm, edit, caps.saveState]);

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
      await refreshSlots();
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
    const infos = await listSaveSlots(local.current);
    const info = infos.find((s) => s.slot === target);
    if (!info || !canLoadSlot(info)) {
      const reason = info?.detail || "Empty slot";
      const msg = `Cannot load: ${reason}`;
      setStatus(msg);
      flashToast(msg);
      throw new Error(msg);
    }
    setStatus("Restoring…");
    try {
      const saved = await readSave(local.current, target);
      await adapter.current.importState(saved.bytes);
      if (disposedRef.current) return;
      if (pausedRef.current) {
        await adapter.current.pause().catch(() => undefined);
      } else {
        await adapter.current.resume().catch(() => undefined);
      }
      setSessionDirty(false);
      setStatus("Restored successfully");
      flashToast("Restored successfully");
    } catch (error) {
      if (disposedRef.current) return;
      const msg =
        "Load failed: " +
        String(error instanceof Error ? error.message : error);
      setStatus(msg);
      flashToast(msg);
      throw error;
    }
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
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setStatus("Exited fullscreen");
      } else {
        await node.requestFullscreen();
        setStatus("Fullscreen");
      }
    } catch (error) {
      setStatus(
        "Fullscreen unavailable: " +
          String(error instanceof Error ? error.message : error),
      );
    }
  }

  function requestExit() {
    if (sessionDirty && caps.saveState) setConfirm("exit");
    else window.location.href = "/library";
  }

  async function applyPrefsPatch(patch: PlayerPrefsPatch) {
    // Intentional release overrides only — never snapshot the full effective prefs.
    const next = mergePlayerPrefs(prefsRef.current, patch);
    setPrefs(next);
    prefsRef.current = next;
    await patchReleasePrefs(id, patch);
    await syncShellKeys(next);
    if (typeof patch.volume === "number" && adapter.current && caps.audio) {
      await adapter.current.setVolume(patch.volume).catch(() => undefined);
      setStatus("Volume updated");
    }
    if (patch.touchVisible !== undefined) {
      setTouch(
        resolveTouchVisible(
          next.touchVisible,
          navigator.maxTouchPoints > 0,
        ),
      );
    }
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
          await withBusy(() => persistSlot(QUICK_SLOT, "Quick save stored"));
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
        case "load-last":
          if (latestSlot) {
            setPendingLoadSlot(latestSlot.slot);
            setConfirm("load");
          }
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
        case "touch-toggle": {
          const next = !touch;
          setTouch(next);
          if (!next) setEdit(false);
          await applyPrefsPatch({ touchVisible: next });
          setMenuOpen(false);
          break;
        }
        case "touch-edit":
          setTouch(true);
          setEdit(true);
          setMenuOpen(false);
          break;
        case "hud-toggle": {
          const nextMinimal = !prefs.hudMinimized;
          await applyPrefsPatch({ hudMinimized: nextMinimal });
          // Closing the menu reveals the float control when minimized.
          if (nextMinimal) setMenuOpen(false);
          break;
        }
        case "reset-prefs":
          await clearReleasePrefs(id);
          {
            const restored = await loadEffectivePrefs(id);
            setPrefs(restored);
            prefsRef.current = restored;
            await syncShellKeys(restored);
            setTouch(
              resolveTouchVisible(
                restored.touchVisible,
                navigator.maxTouchPoints > 0,
              ),
            );
            if (caps.audio && adapter.current) {
              await adapter.current
                .setVolume(restored.volume)
                .catch(() => undefined);
            }
            setStatus("Preferences reset for this game");
            flashToast("Preferences reset");
          }
          break;
        case "exit":
          requestExit();
          break;
      }
    } catch (error) {
      setStatus(String(error instanceof Error ? error.message : error));
    }
  }

  const hudMinimal = prefs.hudMinimized && running;

  return (
    <section
      className="player-shell"
      ref={shell}
      data-paused={paused || undefined}
      data-menu={menuOpen || confirm ? "open" : undefined}
      data-editing={edit || undefined}
      data-hud={hudMinimal ? "minimal" : "full"}
      data-iframe-epoch={iframeEpoch}
      data-runtime-session={runtimeSession || undefined}
    >
      <header className="player-hud" hidden={hudMinimal || undefined}>
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

      {!hudMinimal && (
        <p role="status" className="player-status" aria-live="polite">
          {message}
        </p>
      )}

      {hudMinimal && (
        <button
          ref={floatMenuBtn}
          type="button"
          className="player-float-menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-label="Open game menu"
          disabled={!running}
          onClick={() => setMenuOpen(true)}
        >
          Menu
        </button>
      )}

      <div className="player-viewport">
        <div
          className="player-stage"
          ref={host}
          data-display={prefs.displayMode}
          data-filter={prefs.renderFilter}
        />
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
        prefs={prefs}
        aspect={aspect}
        slot={slot}
        slots={slots}
        latestSlot={latestSlot}
        touchVisible={touch}
        editingTouch={edit}
        hudMinimized={prefs.hudMinimized}
        onClose={() => {
          setMenuOpen(false);
          (hudMinimal ? floatMenuBtn.current : menuBtn.current)?.focus();
        }}
        onAction={(a) => void handleMenuAction(a)}
        onPrefsPatch={(patch) => void applyPrefsPatch(patch)}
        onSlot={setSlot}
        onImportFile={(file) => {
          if (!installation) return;
          void importSave(installation, file)
            .then(async () => {
              setStatus("Backup imported; use Load to restore.");
              await refreshSlots();
            })
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
