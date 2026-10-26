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

  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const adapter = useRef<EmulatorAdapter | null>(null);
  const local = useRef<Installation | undefined>(undefined);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTouch(navigator.maxTouchPoints > 0);
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
      input = new InputRouter(
        (c, v) => runtime!.input(c, v),
        await setting("keymap", defaultKeys),
      );
      setRouter(input);
      setCaps(runtime.capabilities);
      setRunning(true);
      setSessionDirty(true);
      setMessage("Playing on this device");
      await setSetting("recent:" + id, Date.now());
      if (runtime.capabilities.saveState) {
        interval = setInterval(async () => {
          try {
            await storeSave(item, await runtime!.exportState(), AUTOSAVE_SLOT);
          } catch (error) {
            if (!disposed)
              setMessage(
                "Autosave unavailable: " +
                  String(error instanceof Error ? error.message : error),
              );
          }
        }, 30000);
      }
    })().catch((error) => {
      if (disposed) return;
      const raw = String(error instanceof Error ? error.message : error);
      setMessage(isMissingRuntimeError(raw) ? missingRuntimeMessage(raw) : raw);
    });
    return () => {
      disposed = true;
      clearInterval(interval);
      input?.dispose();
      runtime?.dispose();
      adapter.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirm) return;
      e.preventDefault();
      e.stopPropagation();
      if (menuOpen) {
        setMenuOpen(false);
        menuBtn.current?.focus();
      } else {
        setMenuOpen(true);
        router?.clear();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [running, menuOpen, confirm, router]);

  const setStatus = useCallback((text: string) => setMessage(text), []);

  async function persistSlot(target: number, label: string) {
    if (!local.current || !adapter.current)
      throw new Error("Runtime unavailable");
    if (!caps.saveState) throw new Error("Save states unsupported for this core");
    setSaving(true);
    setStatus("Saving…");
    try {
      await storeSave(
        local.current,
        await adapter.current.exportState(),
        target,
      );
      setSessionDirty(false);
      setStatus(label);
    } catch (error) {
      setStatus(
        "Save failed: " +
          String(error instanceof Error ? error.message : error),
      );
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
    setSessionDirty(false);
    setStatus("Restored successfully");
  }

  async function togglePause() {
    if (!adapter.current) return;
    if (paused) {
      await adapter.current.resume();
      setPaused(false);
      setStatus("Resumed");
    } else {
      await adapter.current.pause();
      setPaused(true);
      router?.clear();
      setStatus("Paused");
    }
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
          await persistSlot(QUICK_SLOT, "Quick save saved successfully");
          break;
        case "quick-load":
          setPendingLoadSlot(QUICK_SLOT);
          setConfirm("load");
          break;
        case "save-slot":
          await persistSlot(
            slot,
            slot === AUTOSAVE_SLOT
              ? "Autosave slot saved successfully"
              : `Slot ${slot + 1} saved successfully`,
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
          router?.clear();
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
      data-menu={menuOpen || undefined}
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
                disabled={saving}
                onClick={() =>
                  void handleMenuAction("quick-save").catch(() => {})
                }
              >
                Quick save
              </button>
              <button
                type="button"
                className="secondary hud-btn"
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
            onClick={() => {
              setMenuOpen(true);
              router?.clear();
            }}
            disabled={!running}
          >
            Menu
          </button>
          <a className="button secondary hud-btn" href="/library" onClick={(e) => {
            if (sessionDirty && caps.saveState) {
              e.preventDefault();
              requestExit();
            }
          }}>
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
            onEditCancel={() => setEdit(false)}
          />
        )}
        {paused && !menuOpen && (
          <div className="player-paused-badge" aria-hidden="true">
            Paused
          </div>
        )}
      </div>

      <GameMenu
        open={menuOpen}
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
          void adapter.current
            ?.reset()
            .then(() => {
              setSessionDirty(true);
              setPaused(false);
              setStatus("Game reset");
              setMenuOpen(false);
            })
            .catch((error) =>
              setStatus(String(error instanceof Error ? error.message : error)),
            );
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
          void restoreSlot(target)
            .then(() => setMenuOpen(false))
            .catch((error) =>
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
