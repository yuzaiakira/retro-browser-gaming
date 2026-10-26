"use client";
import { useEffect, useRef, useState } from "react";
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
export default function Player({ id }: { id: string }) {
  const [installation, setInstallation] = useState<Installation>();
  const [message, setMessage] = useState("Checking local game integrity…");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [touch, setTouch] = useState(false);
  const [edit, setEdit] = useState(false);
  const [router, setRouter] = useState<InputRouter | null>(null);
  const [caps, setCaps] = useState({
    saveState: false,
    audio: false,
    analog: false,
  });
  const [slot, setSlot] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const host = useRef<HTMLDivElement>(null);
  const adapter = useRef<EmulatorAdapter | null>(null);
  const local = useRef<Installation | undefined>(undefined);
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
              // Idempotent: keep existing target data on retry (overwrite false).
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
          // Migration failure must not block play of fresh installs; surface status.
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
      setMessage("Running locally · no server rendering");
      await setSetting("recent:" + id, Date.now());
      if (runtime.capabilities.saveState)
        interval = setInterval(async () => {
          try {
            await storeSave(item, await runtime!.exportState(), 9);
          } catch (error) {
            if (!disposed) setMessage("Autosave failed: " + String(error));
          }
        }, 30000);
    })().catch((error) => {
      if (disposed) return;
      const raw = String(error instanceof Error ? error.message : error);
      const missingRuntime =
        /Failed to fetch|404|Load failed|net::ERR|wasm|\.data/i.test(raw) ||
        /beacuse it's likly that the minified files are missing/i.test(raw);
      setMessage(
        missingRuntime
          ? "Emulator runtime files are missing, blocked for public distribution, or unreachable. Source-only clones need an authorized private-asset import; public deployments only sync allowlisted cores (81_eo / virtualjaguar_js are not cleared). See docs/open-source/private-asset-backup.md and browser-distributable-allowlist.json. Original error: " +
            raw
          : raw,
      );
    });
    return () => {
      disposed = true;
      clearInterval(interval);
      input?.dispose();
      runtime?.dispose();
      adapter.current = null;
    };
  }, [id]);
  async function action(fn: () => Promise<void>, success: string) {
    try {
      await fn();
      setMessage(success);
    } catch (error) {
      setMessage(String(error instanceof Error ? error.message : error));
    }
  }
  const save = async () => {
    if (!local.current || !adapter.current)
      throw new Error("Runtime unavailable");
    await storeSave(local.current, await adapter.current.exportState(), slot);
  };
  return (
    <section className="player-page">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            NOW PLAYING ·{" "}
            {installation?.release.console.name ?? "LOCAL LIBRARY"}
          </span>
          <h1>{installation?.game.title ?? "Opening your game"}</h1>
        </div>
        <a className="button secondary" href="/library">
          Exit to library
        </a>
      </div>
      <p role="status" className="status-line">
        {message}
      </p>
      <div className="player-stage" ref={host} />
      {running && (
        <>
          <div className="player-toolbar">
            <button
              onClick={() =>
                action(
                  async () => {
                    if (paused) await adapter.current!.resume();
                    else await adapter.current!.pause();
                    setPaused(!paused);
                    router?.clear();
                  },
                  paused ? "Resumed" : "Paused",
                )
              }
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              className="secondary"
              onClick={() =>
                action(() => adapter.current!.reset(), "Game reset")
              }
            >
              Reset
            </button>
            <button
              className="secondary"
              onClick={() =>
                action(async () => {
                  await host.current?.requestFullscreen();
                }, "Fullscreen")
              }
            >
              Fullscreen
            </button>
            {caps.audio && (
              <label>
                Volume
                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={volume}
                  onChange={(e) => {
                    setVolume(+e.target.value);
                    action(
                      () => adapter.current!.setVolume(+e.target.value),
                      "Volume updated",
                    );
                  }}
                />
              </label>
            )}
            <button className="secondary" onClick={() => setTouch(!touch)}>
              {touch ? "Hide" : "Show"} touch controls
            </button>
            <button
              className="secondary"
              onClick={() => {
                setTouch(true);
                setEdit(!edit);
                router?.clear();
              }}
            >
              {edit ? "Done editing" : "Edit controls"}
            </button>
          </div>
          {touch && (
            <TouchControls
              router={router}
              system={installation!.release.console.slug}
              edit={edit}
              analog={caps.analog}
            />
          )}{" "}
          {caps.saveState && (
            <div className="panel save-panel">
              <h3>Save states</h3>
              <label>
                Slot
                <select value={slot} onChange={(e) => setSlot(+e.target.value)}>
                  {[0, 1, 2, 3, 9].map((n) => (
                    <option key={n} value={n}>
                      {n === 9 ? "Autosave" : `Slot ${n + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => action(save, "State saved on this device")}
              >
                Save state
              </button>
              <button
                className="secondary"
                onClick={() =>
                  action(async () => {
                    const saved = await readSave(installation!, slot);
                    await adapter.current!.importState(saved.bytes);
                  }, "State restored")
                }
              >
                Load state
              </button>
              <button
                className="secondary"
                onClick={() =>
                  action(async () => {
                    const blob = await exportSave(installation!, slot);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${installation!.game.slug}-slot${slot}.json`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }, "Backup exported")
                }
              >
                Export backup
              </button>
              <label className="button secondary">
                Import backup
                <input
                  className="file-input"
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      action(
                        () => importSave(installation!, file),
                        "Backup imported; use Load state to restore.",
                      );
                  }}
                />
              </label>
              <p>
                States are tied to this game and core version. Deleting game
                files preserves saves. Autosave uses slot 10 every 30 seconds.
              </p>
            </div>
          )}
        </>
      )}
      <p className="muted">
        Use arrow keys and Z / X. Enter starts most games. Keyboard mappings are
        configurable in Settings. Exit pauses downloads, not stored progress.
      </p>
    </section>
  );
}
