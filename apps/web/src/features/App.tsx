"use client";
import { useEffect, useState } from "react";
import { api, getManifest, type Catalog } from "@/lib/api";
import { verifyAsset } from "@/lib/storage";
import { db, setSetting } from "@/lib/db";
import {
  assetKey,
  formatBytes,
  type ConsoleInfo,
  type Download,
  type Game,
  type Installation,
  type Manifest,
} from "@/lib/types";
import { downloadAsset, deleteAsset, pauseAsset } from "./downloads";
import { auditInstallation, install, registerSW, SHELL } from "./offline";
import { inspectDevice, probe } from "./compatibility";
import { Art } from "./Art";
import Player from "./Player";
import Settings from "./Settings";
const nav = [
  ["/", "⌂", "Discover"],
  ["/games", "▦", "All games"],
  ["/library", "▣", "My library"],
  ["/downloads", "↓", "Downloads"],
  ["/settings", "⚙", "Settings"],
];
export default function App({ route }: { route: string[] }) {
  const page = route[0] ?? "home";
  const [games, setGames] = useState<Game[]>([]);
  const [detail, setDetail] = useState<Game>();
  const [detailManifest, setDetailManifest] = useState<Manifest>();
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [consoleFilter, setConsoleFilter] = useState(
    route[0] === "consoles" ? route[1] : "",
  );
  const [genreFilter, setGenreFilter] = useState("");
  const [consoles, setConsoles] = useState<ConsoleInfo[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detailError, setDetailError] = useState("");
  const [offline, setOffline] = useState(false);
  const [installs, setInstalls] = useState<Installation[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [compat, setCompat] = useState<{ status: string; reasons: string[] }>();
  const engineeringDemo = games.some((g) => g.catalog_scope === "engineering-demo");
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    addEventListener("online", update);
    addEventListener("offline", update);
    registerSW().catch(() => {});
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;
    async function sync() {
      const database = await db();
      const values = await database.getAll("installations");
      if (!cancelled) {
        setInstalls(values);
        setDownloads(await database.getAll("downloads"));
      }
    }
    sync();
    interval = setInterval(sync, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh]);
  useEffect(() => {
    if (!navigator.onLine) return;
    const abort = new AbortController();
    api<ConsoleInfo[]>("consoles/", abort.signal)
      .then((list) => {
        setConsoles(
          (Array.isArray(list) ? list : []).filter((c) => c.status === "available"),
        );
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!["home", "games", "consoles"].includes(page)) {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (!navigator.onLine) {
          const cached = await (await db()).getAll("library");
          const filtered = cached.filter((g) => {
            if (
              consoleFilter &&
              !g.releases.some((r) => r.console.slug === consoleFilter)
            )
              return false;
            if (genreFilter && g.genre.toLowerCase() !== genreFilter.toLowerCase())
              return false;
            if (
              search &&
              !g.title.toLowerCase().includes(search.toLowerCase())
            )
              return false;
            return true;
          });
          setGames(filtered);
          setCount(filtered.length);
          setMessage("Offline catalog · showing games saved on this device");
        } else {
          const params = new URLSearchParams();
          if (search) params.set("search", search);
          if (consoleFilter) params.set("console", consoleFilter);
          if (genreFilter) params.set("genre", genreFilter);
          params.set("page", String(pageNumber));
          const data = await api<Catalog>(`games/?${params}`, abort.signal);
          setGames(data.results);
          setCount(data.count);
          setMessage("");
          for (const g of data.results) await (await db()).put("library", g);
        }
      } catch (error) {
        if (!abort.signal.aborted)
          setMessage(String(error instanceof Error ? error.message : error));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [page, search, consoleFilter, genreFilter, pageNumber, refresh, offline]);
  useEffect(() => {
    if (page !== "games" || !route[1]) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setDetailError("");
      setDetail(undefined);
      setDetailManifest(undefined);
      try {
        const game = navigator.onLine
          ? await api<Game>(`games/${encodeURIComponent(route[1])}/`)
          : (await (await db()).getAll("library")).find(
              (g) => g.slug === route[1],
            );
        if (!game) {
          throw new Error(
            navigator.onLine
              ? "This game is not available in the current catalog."
              : "Game metadata is not available offline. Open My library.",
          );
        }
        if (cancel) return;
        setDetail(game);
        await (await db()).put("library", game);
        const release = game.releases[0];
        if (!release) {
          throw new Error("This title has no ready release to launch.");
        }
        const manifest = navigator.onLine
          ? await getManifest(release.id)
          : undefined;
        if (cancel) return;
        setDetailManifest(manifest);
        const result = probe(
          await inspectDevice(),
          release,
          manifest?.assets.reduce((total, asset) => total + asset.byteSize, 0) ??
            0,
        );
        setCompat(result);
      } catch (e) {
        if (!cancel) setDetailError(String(e instanceof Error ? e.message : e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [page, route, offline]);
  async function doInstall(game: Game, existing?: Installation) {
    setBusy(true);
    setMessage("Checking compatibility and manifest…");
    try {
      const release = existing?.release ?? game.releases[0];
      const manifest = await getManifest(release.id);
      const result = probe(
        await inspectDevice(),
        release,
        manifest.assets.reduce((s, a) => s + a.byteSize, 0),
      );
      setCompat(result);
      if (result.status === "unsupported")
        throw new Error(result.reasons.join(" "));
      const pending: Installation = {
        id: release.id,
        game,
        release,
        manifest,
        state: "downloaded",
        verifiedAt: 0,
        shellVersion: SHELL,
      };
      await setSetting("pending:" + release.id, pending);
      for (const asset of manifest.assets) {
        const previous = await (await db()).get("downloads", assetKey(asset));
        if (previous?.state !== "verified" || !(await verifyAsset(asset)))
          await downloadAsset(asset, () => setRefresh((x) => x + 1));
      }
      await (await db()).put("installations", pending);
      setMessage("Verifying bundle and preparing offline resources…");
      await install(pending);
      setMessage("Ready offline. Your game is stored on this device.");
      setRefresh((x) => x + 1);
    } catch (error) {
      setMessage(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  }
  async function uninstall(item: Installation) {
    try {
      for (const a of item.manifest.assets) await deleteAsset(a);
      await (await db()).delete("installations", item.id);
      setRefresh((x) => x + 1);
      setMessage("Game files deleted. Your saves are preserved.");
    } catch (error) {
      setMessage(String(error));
    }
  }
  async function resume(d: Download) {
    try {
      const database = await db();
      const pending = await database.getAll("settings");
      const item = pending.find(
        (v): v is Installation =>
          !!v &&
          typeof v === "object" &&
          "manifest" in v &&
          (v as Installation).manifest.assets.some((a) => a.id === d.asset.id),
      );
      if (!item)
        throw new Error("Open the game details to refresh its manifest.");
      await doInstall(item.game, item);
    } catch (e) {
      setMessage(String(e));
    }
  }
  const card = (game: Game) => {
    const release = game.releases[0];
    const ready = installs.some(
      (i) => i.game.id === game.id && i.state === "ready-offline",
    );
    const blurb = game.description.split(".")[0]?.trim();
    return (
      <article className="game-card" key={game.id}>
        <a href={"/games/" + game.slug} className="card-art">
          <Art kind={release?.console.slug} />
          <span className="platform-label">{release?.console.name}</span>
        </a>
        <div className="card-content">
          <div className="tags">
            <span>{game.genre || "Homebrew"}</span>
            <span>{ready ? "● READY OFFLINE" : "DOWNLOAD TO PLAY"}</span>
          </div>
          <a href={"/games/" + game.slug}>
            <h3>{game.title}</h3>
          </a>
          <p>{blurb ? `${blurb}.` : "Open for controls and install options."}</p>
          <a className="card-link" href={"/games/" + game.slug}>
            View game <span>↗</span>
          </a>
        </div>
      </article>
    );
  };
  const genreOptions = Array.from(
    new Set(
      [
        ...games.map((g) => g.genre).filter(Boolean),
        genreFilter,
        "Action",
        "Puzzle",
        "Platformer",
        "Sports",
        "Card",
        "Arcade",
        "Homebrew",
      ].filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const consoleOptions: [string, string][] = [
    ["", "All systems"],
    ...consoles.map((c): [string, string] => [c.slug, c.name]),
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-symbol">◀◀</span>
          <strong>
            rewind<span>POCKET ARCADE</span>
          </strong>
        </a>
        <nav>
          {nav.map(([href, icon, label]) => (
            <a
              className={
                (href === "/" ? page === "home" : "/" + page === href)
                  ? "active"
                  : ""
              }
              href={href}
              key={href}
            >
              <span>{icon}</span>
              {label}
              {href === "/library" && <small>{installs.length}</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> YOUR DEVICE. YOUR ARCADE.
          <p>
            Download once.
            <br />
            Keep the good times offline.
          </p>
          <a href="/diagnostics">Device diagnostics ↗</a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            THE ARCADE <span>/</span>{" "}
            {page === "home" ? "DISCOVER" : page.toUpperCase()}
          </span>
          <div className="network">
            <span className={"status-dot " + (offline ? "amber" : "")} />
            {offline ? "Offline mode" : "Online"}
            <a href="/settings" aria-label="Open settings">
              ⚙
            </a>
          </div>
        </header>
        <main id="main">
          {page === "play" ? (
            <Player id={route[1]} />
          ) : page === "settings" || page === "diagnostics" ? (
            <Settings diagnostics={page === "diagnostics"} />
          ) : page === "offline" ? (
            <section className="panel">
              <h1>You’re offline. Your arcade can stay open.</h1>
              <p>Installed games and saves live on this device.</p>
              <a className="button" href="/library">
                Open my library
              </a>
            </section>
          ) : page === "library" ? (
            <section>
              <span className="eyebrow">SAVED ON THIS DEVICE</span>
              <h1>
                My library<span className="count">{installs.length}</span>
              </h1>
              <p className="lead">Your downloaded games, ready when you are.</p>
              {!installs.length && (
                <div className="empty">
                  <span>▣</span>
                  <h2>Your collection starts here</h2>
                  <p>Download a game from the catalog to play offline.</p>
                  <a className="button" href="/games">
                    Find a game
                  </a>
                </div>
              )}
              <div className="game-grid">
                {installs.map((i) => (
                  <article className="game-card" key={i.id}>
                    <Art kind={i.release.console.slug} />
                    <div className="card-content">
                      <span className="badge">
                        {i.state === "ready-offline"
                          ? "● READY OFFLINE"
                          : i.state.toUpperCase()}
                      </span>
                      <h3>{i.game.title}</h3>
                      <div className="row">
                        <a className="button" href={"/play/" + i.id}>
                          Play game
                        </a>
                        <button
                          className="secondary"
                          onClick={async () => {
                            if (!(await auditInstallation(i))) {
                              await (
                                await db()
                              ).put("installations", {
                                ...i,
                                state: "missing",
                              });
                              setMessage(
                                "Files missing or damaged. Reinstall this game.",
                              );
                            } else
                              setMessage("Game and core integrity verified.");
                            setRefresh((x) => x + 1);
                          }}
                        >
                          Verify
                        </button>
                      </div>
                      <div className="row">
                        <button
                          className="text-button"
                          onClick={() => doInstall(i.game, i)}
                        >
                          Repair / reinstall
                        </button>
                        <button
                          className="text-button danger-text"
                          onClick={() => uninstall(i)}
                        >
                          Delete game files
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : page === "downloads" ? (
            <section>
              <span className="eyebrow">TAKE THE ARCADE WITH YOU</span>
              <h1>Downloads</h1>
              <p className="lead">
                Real bytes. Verified files. Pick up where you left off.
              </p>
              {downloads.length === 0 && (
                <div className="empty">
                  <h2>No downloads yet</h2>
                  <a href="/games">Explore the catalog →</a>
                </div>
              )}
              {downloads.map((d) => (
                <div className="panel download-row" key={d.id}>
                  <div>
                    <h3>{d.asset.filename}</h3>
                    <span className="badge">
                      {d.state === "downloading" && !busy
                        ? "RESUMABLE"
                        : d.state.toUpperCase()}
                    </span>
                    <p>
                      {formatBytes(d.bytesVerified)} /{" "}
                      {formatBytes(d.asset.byteSize)}{" "}
                      {busy && d.speed > 0
                        ? `· ${formatBytes(d.speed)}/s · ~${Math.ceil((d.asset.byteSize - d.bytesVerified) / d.speed)}s remaining`
                        : ""}
                    </p>
                    {d.error && <p className="error-text">{d.error}</p>}
                    <progress max={d.asset.byteSize} value={d.bytesVerified} />
                  </div>
                  <div className="row">
                    <button
                      disabled={busy || d.state === "verified"}
                      onClick={() => resume(d)}
                    >
                      Resume / retry
                    </button>
                    <button
                      className="secondary"
                      onClick={() => pauseAsset(d.asset)}
                    >
                      Pause
                    </button>
                    <button
                      className="secondary"
                      onClick={async () => {
                        try {
                          await deleteAsset(d.asset);
                          setRefresh((x) => x + 1);
                        } catch (e) {
                          setMessage(String(e));
                        }
                      }}
                    >
                      Cancel & delete
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : page === "games" && route[1] ? (
            <section>
              <a className="back" href="/games">
                ← Back to games
              </a>
              {loading ? (
                <p role="status">Loading game…</p>
              ) : detailError ? (
                <div className="empty" role="alert">
                  <h2>Game unavailable</h2>
                  <p>{detailError}</p>
                  <a className="button secondary" href="/games">
                    Browse catalog
                  </a>
                </div>
              ) : detail && detail.releases[0] ? (
                <>
                  <div className="detail-grid">
                    <Art large kind={detail.releases[0].console.slug} />
                    <div>
                      <span className="eyebrow">
                        {detail.releases[0].console.name} / {detail.genre}
                      </span>
                      <h1>{detail.title}</h1>
                      <p className="lead">{detail.description}</p>
                      {detail.releases.length > 1 && (
                        <p className="small">
                          {detail.releases.length} ready releases on this title.
                          Launch uses the primary ready release listed below.
                        </p>
                      )}
                      <div className="panel">
                        <strong>
                          Compatibility · {compat?.status ?? "checking"}
                        </strong>
                        {compat?.reasons.map((r) => <p key={r}>{r}</p>)}
                        <p>
                          Core: {detail.releases[0].recommended_core.code} ·{" "}
                          {detail.releases[0].recommended_core.version}
                        </p>
                        <p>
                          {detail.releases[0].compatibility_note ||
                            "Device-specific compatibility notes are not recorded for this release yet."}
                        </p>
                        <p>
                          Install state:{" "}
                          {installs.some(
                            (i) =>
                              i.id === detail.releases[0].id &&
                              i.state === "ready-offline",
                          )
                            ? "Ready offline on this device"
                            : offline
                              ? "Not installed · connect to download"
                              : "Not installed on this device"}
                        </p>
                        {detailManifest && (
                          <p>
                            Download:{" "}
                            {formatBytes(
                              detailManifest.assets.reduce(
                                (total, asset) => total + asset.byteSize,
                                0,
                              ),
                            )}{" "}
                            · {detailManifest.assets.length} verified file
                            {detailManifest.assets.length === 1 ? "" : "s"} ·{" "}
                            {detailManifest.assets.some(
                              (asset) => asset.role === "bios",
                            )
                              ? "BIOS included"
                              : "No BIOS asset required"}
                          </p>
                        )}
                      </div>
                      {installs.some(
                        (i) =>
                          i.id === detail.releases[0].id &&
                          i.state === "ready-offline",
                      ) ? (
                        <a
                          className="button"
                          href={"/play/" + detail.releases[0].id}
                        >
                          ▶ Play game
                        </a>
                      ) : (
                        <button
                          disabled={
                            busy ||
                            compat?.status === "unsupported" ||
                            offline
                          }
                          onClick={() => doInstall(detail)}
                        >
                          ↓{" "}
                          {busy
                            ? "Downloading…"
                            : offline
                              ? "Online required to download"
                              : "Download & try on this device"}
                        </button>
                      )}
                      <p className="small">
                        No account needed. Game files and saves stay on this
                        device. Downloads verify every file before install.
                      </p>
                      <a href="/downloads">Open download manager →</a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty" role="status">
                  <h2>Game not found</h2>
                  <p>Choose another title from the catalog.</p>
                </div>
              )}
            </section>
          ) : ["home", "games", "consoles"].includes(page) ? (
            <>
              {page === "home" && (
                <section className="hero">
                  <div>
                    <span className="eyebrow">
                      <span className="tiny-pixel" /> GOOD GAMES NEVER GET OLD
                    </span>
                    <h1>
                      Press play.
                      <br />
                      Go <em>back in time.</em>
                    </h1>
                    <p>
                      Your favorite eras. One little arcade.
                      <br />
                      Browser-native play, built to go offline.
                    </p>
                    <a className="button" href="/games">
                      Explore the collection <span>↗</span>
                    </a>
                    <span className="hero-note">
                      NO INSTALLER · NO ACCOUNT · JUST PLAY
                    </span>
                  </div>
                  <div className="hero-art">
                    <Art large />
                    <span className="hero-chip">
                      PLAYER 01 <b>READY</b>
                    </span>
                  </div>
                </section>
              )}
              <section>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">FIND YOUR NEXT HIGH SCORE</span>
                    <h2>
                      {page === "home" ? "The collection" : "All games"}{" "}
                      <span className="count">{count}</span>
                    </h2>
                  </div>
                  <label className="search">
                    <span>⌕</span>
                    <input
                      aria-label="Search games"
                      placeholder="Search the arcade…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPageNumber(1);
                      }}
                    />
                  </label>
                </div>
                {engineeringDemo && (
                  <p className="small" role="note">
                    Local engineering demo catalog — titles here are for QA and
                    are not product-authorized for public marketing.
                  </p>
                )}
                <div className="filters" role="group" aria-label="Filter by system">
                  {consoleOptions.map(([slug, label]) => (
                    <button
                      key={slug || "all"}
                      type="button"
                      className={
                        consoleFilter === slug ? "selected" : "secondary"
                      }
                      onClick={() => {
                        setConsoleFilter(slug);
                        setPageNumber(1);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="filters" role="group" aria-label="Filter by genre">
                  <button
                    type="button"
                    className={genreFilter === "" ? "selected" : "secondary"}
                    onClick={() => {
                      setGenreFilter("");
                      setPageNumber(1);
                    }}
                  >
                    All genres
                  </button>
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className={
                        genreFilter === genre ? "selected" : "secondary"
                      }
                      onClick={() => {
                        setGenreFilter(genre);
                        setPageNumber(1);
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {loading ? (
                  <div className="empty" role="status">
                    Loading your next adventure…
                  </div>
                ) : games.length ? (
                  <div className="game-grid">{games.map(card)}</div>
                ) : (
                  <div className="empty">
                    <h2>No games in this corner yet.</h2>
                    <p>
                      {message
                        ? message
                        : "Try a different system, genre, or search."}
                    </p>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setConsoleFilter("");
                        setGenreFilter("");
                        setPageNumber(1);
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}
                {count > 24 && (
                  <div className="pagination">
                    <button
                      disabled={pageNumber === 1}
                      onClick={() => setPageNumber((x) => x - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {pageNumber}</span>
                    <button
                      disabled={pageNumber * 24 >= count}
                      onClick={() => setPageNumber((x) => x + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
              <div className="info-strip">
                <div>
                  <b>↓ Download once</b>
                  <p>Verified files, resumable transfers.</p>
                </div>
                <div>
                  <b>◈ Play anywhere</b>
                  <p>Installed games work offline.</p>
                </div>
                <div>
                  <b>▣ Keep your progress</b>
                  <p>Local saves with exportable backups.</p>
                </div>
              </div>
            </>
          ) : (
            <section className="empty">
              <h1>That page is out of bounds.</h1>
              <a href="/">Return home</a>
            </section>
          )}
          {message && page !== "play" && (
            <div className="notice" role="status">
              {message}
              <button
                className="text-button"
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
        </main>
        <footer>
          <span>◀◀ REWIND</span>
          <p>Built for the games you come back to.</p>
          <a href="/diagnostics">Compatibility & diagnostics ↗</a>
        </footer>
      </div>
      <nav className="mobile-nav">
        {nav.map(([href, icon, label]) => (
          <a key={href} href={href}>
            <span>{icon}</span>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
