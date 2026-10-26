import type { Game, Installation } from "@/lib/types";
import { Art } from "./Art";

export type CardAction = "play" | "download" | "details";

export function primaryActionFor(
  game: Game,
  install?: Installation,
): { action: CardAction; href: string; label: string } {
  const release = game.releases[0];
  if (install?.state === "ready-offline") {
    return {
      action: "play",
      href: "/play/" + install.id,
      label: "▶ Play",
    };
  }
  if (install?.state === "missing") {
    return {
      action: "details",
      href: "/games/" + game.slug,
      label: "Repair needed",
    };
  }
  if (install?.state === "downloaded") {
    return {
      action: "details",
      href: "/games/" + game.slug,
      label: "Finish install",
    };
  }
  return {
    action: "details",
    href: "/games/" + game.slug,
    label: release ? "View & download" : "Details",
  };
}

export default function GameCard({
  game,
  install,
  compact = false,
  note,
}: {
  game: Game;
  install?: Installation;
  compact?: boolean;
  note?: string;
}) {
  const release = game.releases[0];
  const primary = primaryActionFor(game, install);
  const ready = install?.state === "ready-offline";
  const missing = install?.state === "missing";
  const blurb = game.description.split(".")[0]?.trim();
  const status = missing
    ? "FILES MISSING"
    : ready
      ? "● READY OFFLINE"
      : install
        ? install.state.replace(/-/g, " ").toUpperCase()
        : "DOWNLOAD TO PLAY";

  return (
    <article
      className={"game-card" + (compact ? " game-card-compact" : "")}
      data-ready={ready || undefined}
      data-missing={missing || undefined}
    >
      <a href={"/games/" + game.slug} className="card-art">
        <Art kind={release?.console.slug} />
        <span className="platform-label">
          {release?.console.name || "System"}
        </span>
      </a>
      <div className="card-content">
        <div className="tags">
          <span>{release?.console.name || "System"}</span>
          {game.genre ? <span>{game.genre}</span> : null}
          <span className={ready ? "tag-ready" : missing ? "tag-warn" : ""}>
            {status}
          </span>
        </div>
        <a href={"/games/" + game.slug}>
          <h3>{game.title}</h3>
        </a>
        {note ? (
          <p className="small">{note}</p>
        ) : (
          <p>
            {blurb
              ? `${blurb}.`
              : "Open for controls, size, and install options."}
          </p>
        )}
        {primary.action === "play" ? (
          <a className="button" href={primary.href}>
            {primary.label}
          </a>
        ) : (
          <a
            className={
              primary.action === "details" && !install
                ? "card-link"
                : "button secondary"
            }
            href={primary.href}
          >
            {primary.label} {primary.action === "details" && !install ? (
              <span>↗</span>
            ) : null}
          </a>
        )}
      </div>
    </article>
  );
}
