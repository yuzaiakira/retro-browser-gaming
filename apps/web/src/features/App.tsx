"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import GameCard from "./GameCard";
import ConfirmDialog from "./ConfirmDialog";
import GamepadStatus from "./GamepadStatus";
import {
  hasSaveForInstall,
  loadRecentPlayMap,
  loadSavePresence,
  sortContinuePlaying,
  sortReadyNeverPlayed,
} from "./hub-history";
import {
  buildCatalogPath,
  parseCatalogQuery,
  type CatalogQuery,
} from "./catalog-query";

const nav = [
  ["/", "⌂", "Discover"],
  ["/games", "▦", "All games"],
  ["/library", "▣", "My library"],
  ["/downloads", "↓", "Downloads"],
  ["/settings", "⚙", "Settings"],
] as const;

function downloadLabel(state: Download["state"]) {
  switch (state) {
    case "verified":
      return "Verified · ready to install";
    case "paused":
      return "Paused";
    case "recoverable-error":
    case "fatal-error":
      return "Needs retry";
    case "downloading":
      return "Downloading";
    case "verifying":
      return "Verifying checksum";
    case "checking-space":
      return "Checking storage";
    case "queued":
      return "Queued";
    case "cancelled":
      return "Cancelled";
    default:
      return state;
  }
}

function readCatalogQuery(): CatalogQuery {
  if (typeof window === "undefined") {
    return { search: "", consoleFilter: "", genreFilter: "", pageNumber: 1 };
  }
  return parseCatalogQuery(window.location.search);
}

export default function App({ route }: { route: string[] }) {
  const page = route[0] ?? "home";
  const [games, setGames] = useState<Game[]>([]);
  const [detail, setDetail] = useState<Game>();
  const [detailManifest, setDetailManifest] = useState<Manifest>();
  const [count, setCount] = useState(0);
  const initialQuery = page === "games" && !route[1] ? readCatalogQuery() : null;
  const [searchDraft, setSearchDraft] = useState(initialQuery?.search ?? "");
  const [search, setSearch] = useState(initialQuery?.search ?? "");
  const [consoleFilter, setConsoleFilter] = useState(
    initialQuery?.consoleFilter || (route[0] === "consoles" ? route[1] || "" : ""),
  );
  const [genreFilter, setGenreFilter] = useState(initialQuery?.genreFilter ?? "");
  const [consoles, setConsoles] = useState<ConsoleInfo[]>([]);
  const [pageNumber, setPageNumber] = useState(initialQuery?.pageNumber ?? 1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detailError, setDetailError] = useState("");
  const [offline, setOffline] = useState(false);
  const [installs, setInstalls] = useState<Installation[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [recentMap, setRecentMap] = useState<Map<string, number>>(new Map());
  const [saveIds, setSaveIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [compat, setCompat] = useState<{ status: string; reasons: string[] }>();
  const [deleteTarget, setDeleteTarget] = useState<Installation | null>(null);
  const applyingHistory = useRef(false);
  const lastUrl = useRef(
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "",
  );
  const engineeringDemo = games.some((g) => g.catalog_scope === "engineering-demo");

  const activeDownloads = useMemo(
    () =>
      downloads.some((d) =>
        ["queued", "checking-space", "downloading", "verifying"].includes(d.state),
      ),
    [downloads],
  );

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

  // Re-read local installs/history when the route changes (e.g. leaving the player).
  useEffect(() => {
    setRefresh((n) => n + 1);
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const database = await db();
      const values = await database.getAll("installations");
      const dl = await database.getAll("downloads");
      const recent = await loadRecentPlayMap();
      const saves = await loadSavePresence();
      if (!cancelled) {
        setInstalls(values);
        setDownloads(dl);
        setRecentMap(recent);
        setSaveIds(saves);
      }
    }
    sync();
    const interval = setInterval(sync, activeDownloads ? 800 : 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh, activeDownloads]);

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

  // Debounce search input so typing does not spam history or API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((prev) => {
        if (prev !== searchDraft) setPageNumber(1);
        return searchDraft;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  // Keep /games filters shareable; filters/page push history, search replaces.
  useEffect(() => {
    if (page !== "games" || route[1]) return;
    const onPop = () => {
      applyingHistory.current = true;
      const next = readCatalogQuery();
      setSearchDraft(next.search);
      setSearch(next.search);
      setConsoleFilter(next.consoleFilter);
      setGenreFilter(next.genreFilter);
      setPageNumber(next.pageNumber);
      lastUrl.current = window.location.pathname + window.location.search;
      queueMicrotask(() => {
        applyingHistory.current = false;
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [page, route]);

  useEffect(() => {
    if (page !== "games" || route[1] || applyingHistory.current) return;
    const next = buildCatalogPath({
      search,
      consoleFilter,
      genreFilter,
      pageNumber,
    });
    if (next === lastUrl.current) return;
    // Search edits replace the current entry; explicit filter/page changes push.
    const prev = parseCatalogQuery(
      lastUrl.current.includes("?")
        ? lastUrl.current.slice(lastUrl.current.indexOf("?"))
        : "",
    );
    const onlySearchChanged =
      prev.consoleFilter === consoleFilter &&
      prev.genreFilter === genreFilter &&
      prev.pageNumber === pageNumber &&
      prev.search !== search;
    // Explicit filter/page changes push so Back/Forward works. Search-only
    // edits replace. Never treat a clean `/games` URL as "always replace" —
    // that collapsed the first filter click into the landing entry.
    if (onlySearchChanged) {
      window.history.replaceState(null, "", next);
    } else if (
      prev.consoleFilter !== consoleFilter ||
      prev.genreFilter !== genreFilter ||
      prev.pageNumber !== pageNumber
    ) {
      window.history.pushState(null, "", next);
    } else {
      window.history.replaceState(null, "", next);
    }
    lastUrl.current = next;
  }, [page, route, search, consoleFilter, genreFilter, pageNumber]);

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
            if (search && !g.title.toLowerCase().includes(search.toLowerCase()))
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
          : (await (await db()).getAll("library")).find((g) => g.slug === route[1]);
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
        if (!release) throw new Error("This title has no ready release to launch.");
        const manifest = navigator.onLine ? await getManifest(release.id) : undefined;
        if (cancel) return;
        setDetailManifest(manifest);
        const result = probe(
          await inspectDevice(),
          release,
          manifest?.assets.reduce((total, asset) => total + asset.byteSize, 0) ?? 0,
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
      setMessage(
        `${game.title} is Ready Offline. Open Play from the library or details — Continue Playing appears after you launch it once.`,
      );
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

  const continuePlaying = sortContinuePlaying(installs, recentMap, 6);
  const readyNeverPlayed = sortReadyNeverPlayed(installs, recentMap, 6);
  const heroPlayTarget = continuePlaying[0] ?? readyNeverPlayed[0];
  const librarySorted = [...installs].sort((a, b) => {
    const ra = recentMap.get(a.id) ?? 0;
    const rb = recentMap.get(b.id) ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.verifiedAt || 0) - (a.verifiedAt || 0);
  });

  function playNote(i: Installation) {
    const parts = [i.release.console.name, "Ready offline"];
    if (hasSaveForInstall(i.id, saveIds)) {
      parts.push("Local save available");
    }
    return parts.join(" · ");
  }

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

  const filtersActive = !!(search || consoleFilter || genreFilter || pageNumber > 1);

  function navActive(href: string) {
    if (href === "/") return page === "home";
    return "/" + page === href;
  }

  const downloadGroups = useMemo(() => {
    const groups = new Map<string, { title: string; href?: string; items: Download[] }>();
    for (const d of downloads) {
      const hit = installs.find((i) =>
        i.manifest.assets.some((a) => a.id === d.asset.id),
      );
      const meta = hit
        ? { title: hit.game.title, href: "/games/" + hit.game.slug }
        : { title: d.asset.filename, href: undefined as string | undefined };
      const key = meta.href || meta.title;
      const existing = groups.get(key);
      if (existing) existing.items.push(d);
      else groups.set(key, { title: meta.title, href: meta.href, items: [d] });
    }
    return [...groups.values()];
  }, [downloads, installs]);

  return (
    <div
      className={"app" + (page === "play" ? " immersive-play" : "")}
      data-nav-root
    >
      <GamepadStatus gameplayActive={page === "play"} />
      <aside className="sidebar" hidden={page === "play"}>
        <a href="/" className="brand">
          <span className="brand-symbol">◀◀</span>
          <strong>
            rewind<span>POCKET ARCADE</span>
          </strong>
        </a>
        <nav aria-label="Primary">
          {nav.map(([href, icon, label]) => (
            <a
              className={navActive(href) ? "active" : ""}
              href={href}
              key={href}
              aria-current={navActive(href) ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {href === "/library" && <small>{installs.length}</small>}
              {href === "/downloads" && activeDownloads && (
                <small aria-label="Downloads in progress">●</small>
              )}
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
        {page !== "play" && (
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
        )}
        <main id="main" className={page === "play" ? "main-play" : undefined}>
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
              <p className="lead">
                Your personal collection. Play offline anytime — saves stay here
                unless you delete them.
              </p>
              {!installs.length && (
                <div className="empty first-run">
                  <span aria-hidden="true">▣</span>
                  <h2>Your collection starts here</h2>
                  <p>
                    Download a game once to play offline. No account required —
                    files and progress stay on this device.
                  </p>
                  <a className="button" href="/games">
                    Explore games
                  </a>
                </div>
              )}
              {continuePlaying.length > 0 && (
                <section className="continue-strip" data-testid="continue-playing">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">RECENTLY PLAYED</span>
                      <h2>Continue playing</h2>
                    </div>
                  </div>
                  <p className="small">
                    Games you launched here. A local save badge means a stored
                    state exists — restore it from the player menu after launch.
                  </p>
                  <div className="game-grid compact-grid">
                    {continuePlaying.map((i) => (
                      <GameCard
                        key={"cont-lib-" + i.id}
                        game={i.game}
                        install={i}
                        compact
                        note={playNote(i)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {readyNeverPlayed.length > 0 && (
                <section className="continue-strip" data-testid="ready-to-play">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">READY OFFLINE</span>
                      <h2>Installed · not opened yet</h2>
                    </div>
                  </div>
                  <div className="game-grid compact-grid">
                    {readyNeverPlayed.map((i) => (
                      <GameCard
                        key={"ready-lib-" + i.id}
                        game={i.game}
                        install={i}
                        compact
                        note={playNote(i)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {librarySorted.length > 0 && (
                <>
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">INSTALLED</span>
                      <h2>Ready & maintenance</h2>
                    </div>
                    <a href="/games">Find more games →</a>
                  </div>
                  <div className="game-grid">
                    {librarySorted.map((i) => (
                      <article className="game-card" key={i.id} data-ready={i.state === "ready-offline" || undefined} data-missing={i.state === "missing" || undefined}>
                        <a href={"/games/" + i.game.slug} className="card-art">
                          <Art kind={i.release.console.slug} />
                          <span className="platform-label">
                            {i.release.console.name}
                          </span>
                        </a>
                        <div className="card-content">
                          <span className="badge">
                            {i.state === "ready-offline"
                              ? "● READY OFFLINE"
                              : i.state === "missing"
                                ? "FILES MISSING"
                                : i.state.toUpperCase()}
                          </span>
                          <h3>{i.game.title}</h3>
                          <p>
                            {i.release.console.name}
                            {recentMap.get(i.id)
                              ? " · Played on this device"
                              : ""}
                          </p>
                          <div className="library-actions">
                            {i.state === "ready-offline" ? (
                              <a className="button" href={"/play/" + i.id}>
                                ▶ Play
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void doInstall(i.game, i)}
                              >
                                Repair / reinstall
                              </button>
                            )}
                            <a className="button secondary" href={"/games/" + i.game.slug}>
                              Details
                            </a>
                          </div>
                          <details className="library-maintain">
                            <summary>Installation tools</summary>
                            <div className="row" style={{ marginTop: 10 }}>
                              <button
                                type="button"
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
                                      "Files missing or damaged. Use Repair to reinstall without losing saves.",
                                    );
                                  } else
                                    setMessage("Game and core integrity verified.");
                                  setRefresh((x) => x + 1);
                                }}
                              >
                                Verify files
                              </button>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => void doInstall(i.game, i)}
                              >
                                Repair / reinstall
                              </button>
                              <button
                                type="button"
                                className="text-button danger-text"
                                onClick={() => setDeleteTarget(i)}
                              >
                                Delete game files…
                              </button>
                            </div>
                          </details>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : page === "downloads" ? (
            <section>
              <span className="eyebrow">TAKE THE ARCADE WITH YOU</span>
              <h1>Downloads</h1>
              <p className="lead">
                Real progress from verified bytes. Pause, resume, and recover
                after reload — no invented percentages.
              </p>
              {downloads.length === 0 && (
                <div className="empty">
                  <h2>No downloads yet</h2>
                  <p>Pick a game to download once for offline play.</p>
                  <a className="button" href="/games">
                    Explore the catalog
                  </a>
                </div>
              )}
              {downloadGroups.map((group) => (
                <div className="download-group" key={group.href || group.title}>
                  <h2>
                    {group.href ? (
                      <a href={group.href}>{group.title}</a>
                    ) : (
                      group.title
                    )}
                  </h2>
                  {group.items.map((d) => {
                    const pct =
                      d.asset.byteSize > 0
                        ? Math.min(
                            100,
                            Math.round((d.bytesVerified / d.asset.byteSize) * 100),
                          )
                        : 0;
                    const label = downloadLabel(d.state);
                    return (
                      <div className="panel download-row" key={d.id}>
                        <div>
                          <h3>{d.asset.filename}</h3>
                          <span className="badge">{label}</span>
                          <p className="download-meta" role="status" aria-live="polite">
                            {pct}% · {formatBytes(d.bytesVerified)} /{" "}
                            {formatBytes(d.asset.byteSize)}
                            {d.state === "downloading" && d.speed > 0
                              ? ` · ${formatBytes(d.speed)}/s · ~${Math.max(1, Math.ceil((d.asset.byteSize - d.bytesVerified) / d.speed))}s remaining (estimate)`
                              : ""}
                          </p>
                          {d.error && (
                            <p className="error-text" role="alert">
                              {d.error}. Free browser storage or tap Resume /
                              retry.
                            </p>
                          )}
                          <progress
                            max={d.asset.byteSize || 1}
                            value={d.bytesVerified}
                            aria-label={`${d.asset.filename} download ${pct} percent`}
                          />
                        </div>
                        <div className="row">
                          <button
                            type="button"
                            disabled={busy || d.state === "verified"}
                            onClick={() => void resume(d)}
                          >
                            {d.state === "recoverable-error" ||
                            d.state === "fatal-error" ||
                            d.state === "paused" ||
                            d.state === "cancelled"
                              ? "Resume / retry"
                              : d.state === "verified"
                                ? "Verified"
                                : "Continue"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={d.state !== "downloading"}
                            onClick={() => pauseAsset(d.asset)}
                          >
                            Pause
                          </button>
                          <button
                            type="button"
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
                    );
                  })}
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
                      <div
                        className="panel compat-summary"
                        data-status={compat?.status || "unknown"}
                      >
                        <strong>
                          Compatibility · {compat?.status ?? "checking"}
                        </strong>
                        {compat?.status === "unsupported" && (
                          <p role="status">
                            This browser cannot install or play this title yet.
                            See reasons below, or open{" "}
                            <a href="/diagnostics#browser-support">
                              Diagnostics · browser support
                            </a>
                            .
                          </p>
                        )}
                        {compat?.status === "limited" && (
                          <p>
                            You can try with awareness — some features may be
                            limited on this device.
                          </p>
                        )}
                        {compat?.reasons.map((r) => (
                          <p key={r}>{r}</p>
                        ))}
                        <p>
                          Install state:{" "}
                          {installs.some(
                            (i) =>
                              i.id === detail.releases[0].id &&
                              i.state === "ready-offline",
                          )
                            ? "Ready offline on this device"
                            : installs.some(
                                  (i) =>
                                    i.id === detail.releases[0].id &&
                                    i.state === "missing",
                                )
                              ? "Installed files missing — repair from My library"
                              : offline
                                ? "Not installed · connect to download"
                                : "Not installed on this device"}
                        </p>
                        {detailManifest && (
                          <p>
                            Download size:{" "}
                            {formatBytes(
                              detailManifest.assets.reduce(
                                (total, asset) => total + asset.byteSize,
                                0,
                              ),
                            )}{" "}
                            · {detailManifest.assets.length} verified file
                            {detailManifest.assets.length === 1 ? "" : "s"}
                          </p>
                        )}
                        <details className="tech-details">
                          <summary>Technical details</summary>
                          <p>
                            Core: {detail.releases[0].recommended_core.code} ·{" "}
                            {detail.releases[0].recommended_core.version}
                          </p>
                          <p>
                            {detail.releases[0].compatibility_note ||
                              "Device-specific compatibility notes are not recorded for this release yet."}
                          </p>
                          {detailManifest && (
                            <p>
                              {detailManifest.assets.some(
                                (asset) => asset.role === "bios",
                              )
                                ? "BIOS included in the verified bundle"
                                : "No BIOS asset required"}
                            </p>
                          )}
                          {detail.releases.length > 1 && (
                            <p>
                              {detail.releases.length} ready releases on this
                              title. Launch uses the primary ready release.
                            </p>
                          )}
                        </details>
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
                          type="button"
                          disabled={
                            busy ||
                            compat?.status === "unsupported" ||
                            offline
                          }
                          onClick={() => void doInstall(detail)}
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
                      {continuePlaying.length
                        ? "Pick up a game you already opened on this device, or explore something new."
                        : readyNeverPlayed.length
                          ? "You have games Ready Offline. Launch one to start your local play history."
                          : "Download once, play offline. Browser-native retro games with no account required."}
                    </p>
                    <div className="hero-cta-row">
                      <a
                        className="button"
                        href={
                          continuePlaying[0]
                            ? "/play/" + continuePlaying[0].id
                            : heroPlayTarget
                              ? "/play/" + heroPlayTarget.id
                              : "/games"
                        }
                      >
                        {continuePlaying[0]
                          ? "Continue playing"
                          : heroPlayTarget
                            ? "Play installed game"
                            : "Explore games"}{" "}
                        <span>↗</span>
                      </a>
                      {(continuePlaying[0] || heroPlayTarget) && (
                        <a className="button secondary" href="/games">
                          Browse catalog
                        </a>
                      )}
                      {installs.length > 0 && (
                        <a className="button secondary" href="/library">
                          My library
                        </a>
                      )}
                    </div>
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
              {page === "home" && !installs.length && !loading && (
                <section className="first-run" aria-labelledby="first-run-title">
                  <h2 id="first-run-title">Welcome to your pocket arcade</h2>
                  <p>
                    Pick a game, download it once, and it stays ready offline on
                    this device. Saves never leave your browser unless you export
                    them.
                  </p>
                  <a className="button" href="/games">
                    Explore games
                  </a>
                </section>
              )}
              {page === "home" && continuePlaying.length > 0 && (
                <section className="continue-strip" data-testid="continue-playing">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">RECENTLY PLAYED</span>
                      <h2>Continue playing</h2>
                    </div>
                    <a href="/library">My library →</a>
                  </div>
                  <p className="small">
                    Games you launched on this device. Opening a title is not the
                    same as restoring a save — use Quick save in the player when
                    you want a restore point.
                    {continuePlaying.some((i) => hasSaveForInstall(i.id, saveIds))
                      ? " Titles marked with a local save have a stored state available after launch."
                      : ""}
                  </p>
                  <div className="game-grid compact-grid">
                    {continuePlaying.map((i) => (
                      <GameCard
                        key={"cont-" + i.id}
                        game={i.game}
                        install={i}
                        compact
                        note={playNote(i)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {page === "home" && readyNeverPlayed.length > 0 && (
                <section className="continue-strip" data-testid="ready-to-play">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">INSTALLED · NOT OPENED YET</span>
                      <h2>Ready to play</h2>
                    </div>
                  </div>
                  <p className="small">
                    Ready Offline on this device, but not in Continue Playing until
                    you launch them once.
                  </p>
                  <div className="game-grid compact-grid">
                    {readyNeverPlayed.map((i) => (
                      <GameCard
                        key={"ready-" + i.id}
                        game={i.game}
                        install={i}
                        compact
                        note={playNote(i)}
                      />
                    ))}
                  </div>
                </section>
              )}
              <section>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">FIND YOUR NEXT HIGH SCORE</span>
                    <h2>
                      {page === "home" ? "Explore games" : "All games"}{" "}
                      <span className="count">{count}</span>
                    </h2>
                  </div>
                  <label className="search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label="Search games"
                      placeholder="Search the arcade…"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                    />
                  </label>
                </div>
                {engineeringDemo && (
                  <p className="small" role="note">
                    Local engineering demo catalog — titles here are for QA and
                    are not product-authorized for public marketing.
                  </p>
                )}
                <div className="filters-toolbar">
                  {filtersActive && (
                    <button
                      type="button"
                      className="secondary clear-filters"
                      onClick={() => {
                        setSearchDraft("");
                        setSearch("");
                        setConsoleFilter("");
                        setGenreFilter("");
                        setPageNumber(1);
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div
                  className="filters filter-chip-row"
                  role="group"
                  aria-label="Filter by system"
                >
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
                <div
                  className="filters filter-chip-row"
                  role="group"
                  aria-label="Filter by genre"
                >
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
                  <div className="game-grid">
                    {games.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        install={installs.find((i) => i.game.id === game.id)}
                      />
                    ))}
                  </div>
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
                        setSearchDraft("");
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
                      type="button"
                      disabled={pageNumber === 1}
                      onClick={() => setPageNumber((x) => x - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {pageNumber}
                    </span>
                    <button
                      type="button"
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
        {page !== "play" && (
          <footer>
            <span>◀◀ REWIND</span>
            <p>Built for the games you come back to.</p>
            <p className="small">
              Public Alpha — supported browsers and offline install tips live in
              diagnostics. Source clones do not include private WASM core
              binaries.
            </p>
            <a href="/diagnostics#alpha-feedback">
              Alpha limits & feedback ↗
            </a>
            <a href="/diagnostics#licensing-notices">Licensing notices ↗</a>
            <a href="/diagnostics">Compatibility & diagnostics ↗</a>
          </footer>
        )}
      </div>
      {page !== "play" && (
        <nav className="mobile-nav" aria-label="Mobile">
          {nav.map(([href, icon, label]) => (
            <a
              key={href}
              href={href}
              className={navActive(href) ? "active" : ""}
              aria-current={navActive(href) ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </a>
          ))}
        </nav>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete game files?"
        message="Removes the downloaded game and core files from this device. Save states stay unless you delete them separately in Settings."
        confirmLabel="Delete files"
        cancelLabel="Keep files"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void uninstall(target);
        }}
      />
    </div>
  );
}
