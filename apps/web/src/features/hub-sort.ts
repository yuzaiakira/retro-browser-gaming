import type { Installation } from "@/lib/types";

/** Ready installs the user has actually launched (genuine `recent:*` timestamps). */
export function sortContinuePlaying(
  installs: Installation[],
  recent: Map<string, number>,
  limit = 6,
): Installation[] {
  return [...installs]
    .filter((i) => i.state === "ready-offline" && (recent.get(i.id) ?? 0) > 0)
    .sort((a, b) => {
      const ra = recent.get(a.id) ?? 0;
      const rb = recent.get(b.id) ?? 0;
      return rb - ra;
    })
    .slice(0, limit);
}

/** Ready installs that have never been launched on this device. */
export function sortReadyNeverPlayed(
  installs: Installation[],
  recent: Map<string, number>,
  limit = 6,
): Installation[] {
  return [...installs]
    .filter((i) => i.state === "ready-offline" && (recent.get(i.id) ?? 0) <= 0)
    .sort((a, b) => (b.verifiedAt || 0) - (a.verifiedAt || 0))
    .slice(0, limit);
}

/** True when IndexedDB has any save-state row for this installation id. */
export function hasSaveForInstall(
  installId: string,
  saveKeys: Iterable<string>,
): boolean {
  const prefix = installId + ":";
  for (const key of saveKeys) {
    if (key.startsWith(prefix) && key.includes(":state:")) return true;
  }
  return false;
}
