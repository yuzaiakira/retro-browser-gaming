"use client";
import { useEffect, useState } from "react";
import { db, setting, setSetting } from "@/lib/db";
import { commands, defaultKeys } from "./input";
import { benchmark, inspectDevice, type Device } from "./compatibility";
import { candidates } from "@/emulators/registry";
import {
  DEFAULT_PLAYER_PREFS,
  DEFAULT_SHORTCUTS,
  type DisplayMode,
  type PlayerPrefs,
  type RenderFilter,
  type ShortcutAction,
} from "./player-prefs";
import {
  loadGlobalPrefs,
  resetGlobalPrefs,
  saveGlobalPrefs,
} from "./player-prefs-store";
import { formatShortcutCode, shortcutLabel } from "./player-shortcuts";
import { integerScalingSupport } from "./player-display";

export default function Settings({
  diagnostics = false,
}: {
  diagnostics?: boolean;
}) {
  const [device, setDevice] = useState<Device>();
  const [keys, setKeys] = useState(defaultKeys);
  const [command, setCommand] = useState(0);
  const [prefs, setPrefs] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  const [bindAction, setBindAction] = useState<ShortcutAction | null>(null);
  const [message, setMessage] = useState("");
  const [benchmarkResult, setBenchmarkResult] = useState(
    "Not run. This optional estimate does not predict game FPS.",
  );
  useEffect(() => {
    inspectDevice().then(setDevice);
    setting("keymap", defaultKeys).then(setKeys);
    loadGlobalPrefs().then(setPrefs);
  }, []);
  async function persistPrefs(next: PlayerPrefs) {
    setPrefs(next);
    await saveGlobalPrefs(next);
  }
  async function persist() {
    try {
      setMessage(
        (await navigator.storage.persist())
          ? "Persistent storage granted."
          : "The browser declined persistent storage; keep save backups.",
      );
    } catch (e) {
      setMessage(String(e));
    }
  }
  const feedbackMailto =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_ALPHA_FEEDBACK_MAILTO?.trim()
      : undefined;
  const feedbackUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_ALPHA_FEEDBACK_URL?.trim()
      : undefined;
  return (
    <section>
      <span className="eyebrow">MAKE IT YOURS</span>
      <h1>{diagnostics ? "Device diagnostics" : "Settings & controls"}</h1>
      {!diagnostics && (
        <p className="lead">
          Everyday controls for play and storage. Technical diagnostics live
          below and on the diagnostics page.
        </p>
      )}
      {diagnostics && (
        <>
          <div className="panel" id="browser-support">
            <h2>Browser support</h2>
            <p>
              Installs need a secure context, Origin Private File System (OPFS),
              and the Web Locks API. Chromium and Firefox desktop/mobile builds
              that expose these APIs are the supported Alpha path. Playwright
              WebKit gaps are not evidence of real Safari.
            </p>
            {!device?.opfs && (
              <p role="status">
                This browser reports no OPFS — download/install is disabled until
                <code> navigator.storage.getDirectory</code> is available.
              </p>
            )}
            {!device?.locks && (
              <p role="status">
                Web Locks API unavailable — safe concurrent downloads cannot run
                here.
              </p>
            )}
            {!device?.secure && (
              <p role="status">
                Secure context required (HTTPS or localhost).
              </p>
            )}
          </div>
          <div className="panel" id="alpha-feedback">
            <h2>Public Alpha limits</h2>
            <p>
              This build is an early Alpha. Catalog titles may change; some
              systems need separately provisioned emulator binaries that are not
              shipped in a public source clone. Experimental platforms are not
              product releases. Physical gamepad, iOS Safari, and staging HTTPS
              gates remain open until verified separately.
            </p>
            <p className="small">
              Feedback is optional and privacy-conscious: use a link below only
              if you choose to contact the maintainers. No analytics or
              third-party trackers are loaded by this page. Do not attach
              proprietary ROMs, BIOS files, or personal save data.
            </p>
            {feedbackUrl ? (
              <p>
                <a href={feedbackUrl} rel="noopener noreferrer">
                  Open Alpha feedback form
                </a>
              </p>
            ) : null}
            {feedbackMailto ? (
              <a
                href={`mailto:${encodeURIComponent(feedbackMailto)}?subject=${encodeURIComponent("Retro Browser Gaming Alpha feedback")}`}
              >
                Email Alpha feedback
              </a>
            ) : !feedbackUrl ? (
              <p className="small" role="note">
                Feedback contact is not configured (
                <code>NEXT_PUBLIC_ALPHA_FEEDBACK_URL</code> or{" "}
                <code>NEXT_PUBLIC_ALPHA_FEEDBACK_MAILTO</code>). Use your
                maintainer’s published channel when available.
              </p>
            ) : null}
          </div>
          <div className="panel" id="licensing-notices">
            <h2>Licensing & third-party notices</h2>
            <p>
              First-party application code is intended for a separate open-source
              license chosen by the project owner (proposed MIT — not yet enacted
              as a root LICENSE). Emulator runtimes remain under their own terms:
            </p>
            <ul>
              <li>EmulatorJS loaders — GPL-3.0</li>
              <li>jsdos / emulators — GPL-2.0</li>
              <li>js2me — MIT</li>
              <li>Homebrew fixtures — MIT / GPL / CC0 as labeled in the repo</li>
            </ul>
            <p className="small">
              Emulator <code>.data</code>/<code>.wasm</code> payloads are not
              bundled in public source clones. Public deployments sync only
              allowlisted browser-distributable cores; some experimental
              rebuilds are excluded until corresponding source is complete.
              GPL corresponding-source duties still apply when binaries are
              served. Maintainers: see{" "}
              <code>docs/open-source/third-party-notices.md</code>,{" "}
              <code>corresponding-source.md</code>, and{" "}
              <code>browser-distributable-allowlist.json</code>. Proprietary
              BIOS/ROMs are not included.
            </p>
          </div>
        </>
      )}

      <div className="settings-everyday">
        <div className="panel">
          <h2>Play defaults</h2>
          <p>
            Global comfort defaults for every game. Opening a title can override
            these locally on this device — reset from the in-game menu.
          </p>
          <label>
            Display mode
            <select
              value={prefs.displayMode}
              onChange={(e) =>
                void persistPrefs({
                  ...prefs,
                  displayMode: e.target.value as DisplayMode,
                })
              }
            >
              <option value="fit">Fit (maximize, keep ratio)</option>
              <option value="original">Original aspect (documented ratio)</option>
            </select>
          </label>
          <p className="small">{integerScalingSupport().reason}</p>
          <label>
            Frame scaling
            <select
              value={prefs.renderFilter}
              onChange={(e) =>
                void persistPrefs({
                  ...prefs,
                  renderFilter: e.target.value as RenderFilter,
                })
              }
            >
              <option value="auto">Browser default</option>
              <option value="sharp">Sharp (iframe only)</option>
              <option value="smooth">Smooth</option>
            </select>
          </label>
          <label>
            Default volume
            <input
              aria-label="Default volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={prefs.volume}
              onChange={(e) =>
                void persistPrefs({ ...prefs, volume: +e.target.value })
              }
            />
          </label>
          <label>
            Touch controls
            <select
              value={String(prefs.touchVisible)}
              onChange={(e) => {
                const v = e.target.value;
                void persistPrefs({
                  ...prefs,
                  touchVisible:
                    v === "auto" ? "auto" : v === "true" ? true : false,
                });
              }}
            >
              <option value="auto">Auto (follow device)</option>
              <option value="true">Always show</option>
              <option value="false">Hide by default</option>
            </select>
          </label>
          <label className="row" style={{ gap: 10 }}>
            <input
              type="checkbox"
              checked={prefs.shortcutsEnabled}
              onChange={(e) =>
                void persistPrefs({
                  ...prefs,
                  shortcutsEnabled: e.target.checked,
                })
              }
            />
            Enable player shortcuts
          </label>
          <div className="shortcut-list" style={{ marginTop: 12 }}>
            {(Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]).map(
              (action) => (
                <div key={action} className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{shortcutLabel(action)}</span>
                  <kbd>{formatShortcutCode(prefs.shortcuts[action])}</kbd>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setBindAction(action)}
                  >
                    {bindAction === action ? "Press a key…" : "Rebind"}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      void persistPrefs({
                        ...prefs,
                        shortcuts: { ...prefs.shortcuts, [action]: null },
                      })
                    }
                  >
                    Off
                  </button>
                </div>
              ),
            )}
          </div>
          {bindAction && (
            <input
              autoFocus
              readOnly
              aria-label={`Bind shortcut for ${shortcutLabel(bindAction)}`}
              placeholder="Press a key (Esc cancels)"
              onKeyDown={(e) => {
                e.preventDefault();
                if (e.key === "Escape") {
                  setBindAction(null);
                  return;
                }
                const action = bindAction;
                setBindAction(null);
                void persistPrefs({
                  ...prefs,
                  shortcuts: { ...prefs.shortcuts, [action]: e.code },
                });
              }}
            />
          )}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              void resetGlobalPrefs().then((p) => {
                setPrefs(p);
                setMessage("Global play defaults restored.");
              })
            }
          >
            Restore play defaults
          </button>
        </div>
        <div className="panel">
          <h2>Keyboard mapping</h2>
          <p>Used while playing. Does not change touch layouts.</p>
          <label>
            Action
            <select
              value={command}
              onChange={(e) => setCommand(+e.target.value)}
            >
              {Object.entries(commands).map(([name, n]) => (
                <option key={name} value={n}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Press a key
            <input
              readOnly
              placeholder="Focus here and press a key"
              onKeyDown={(e) => {
                e.preventDefault();
                const next = { ...keys, [e.code]: command };
                setKeys(next);
                void setSetting("keymap", next);
              }}
            />
          </label>
          <div className="keymap">
            {Object.entries(keys).map(([key, n]) => (
              <span key={key}>
                <kbd>{key}</kbd>{" "}
                {Object.keys(commands).find((k) => commands[k] === n)}{" "}
                <button
                  aria-label={`Remove ${key}`}
                  className="text-button"
                  onClick={() => {
                    const next = { ...keys };
                    delete next[key];
                    setKeys(next);
                    void setSetting("keymap", next);
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setKeys(defaultKeys);
              void setSetting("keymap", defaultKeys);
            }}
          >
            Restore keyboard defaults
          </button>
        </div>
        <div className="panel">
          <h2>On-device storage</h2>
          <p>
            {device?.quota
              ? `${((device.usage ?? 0) / 1048576).toFixed(1)} MiB used of ${(device.quota / 1073741824).toFixed(1)} GiB estimated quota`
              : "Storage quota unavailable."}
          </p>
          <button type="button" onClick={() => void persist()}>
            Request persistent storage
          </button>
          <p role="status">{message}</p>
          <p>
            Browser cleanup can remove local data. Export important saves.
            Downloads resume when you return; they do not continue with the
            browser fully closed.
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Save management</h2>
        <p>
          Deleting a game does not delete saves. This action explicitly deletes
          all local save states and backups.
        </p>
        <button
          type="button"
          className="danger"
          onClick={async () => {
            if (confirm("Permanently delete all save states and backups?")) {
              await (await db()).clear("saves");
              setMessage("All save states deleted.");
            }
          }}
        >
          Delete all saves…
        </button>
      </div>

      <details className="panel settings-advanced">
        <summary>Advanced · device capabilities & diagnostics</summary>
        <div className="settings-grid" style={{ marginTop: 16 }}>
          <div className="panel">
            <h3>Device capabilities</h3>
            {device && (
              <dl>
                {Object.entries(device)
                  .filter(
                    ([key]) => !["userAgent", "quota", "usage"].includes(key),
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value ? "Available" : "Unavailable"}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {!device?.opfs && (
              <p role="status">
                OPFS is unavailable in this browser. Catalog browsing may work,
                but download/install stays disabled until Origin Private File
                System is present.
              </p>
            )}
            <p className="small">{device?.userAgent}</p>
            <p>
              <a href="/diagnostics">Open full diagnostics →</a>
            </p>
          </div>
          <div className="panel">
            <h3>Optional performance check</h3>
            <p>{benchmarkResult}</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await benchmark();
                  await setSetting("benchmark", result);
                  setBenchmarkResult(
                    `${result.iterations.toLocaleString()} integer operations in ${result.milliseconds.toFixed(0)} ms. Game performance still requires an actual play test.`,
                  );
                } catch (e) {
                  setBenchmarkResult(String(e));
                }
              }}
            >
              Run 250 ms worker benchmark
            </button>
            <p>Skipping this check does not block play.</p>
          </div>
        </div>
        <details className="panel">
          <summary>Expansion & experimental systems</summary>
          <p>
            These are research candidates. They cannot be launched as supported
            systems.
          </p>
          <div className="candidate-grid">
            {candidates.map((c) => (
              <span key={c.id}>
                {c.name}
                <small>RESEARCH</small>
              </span>
            ))}
          </div>
        </details>
      </details>
    </section>
  );
}
