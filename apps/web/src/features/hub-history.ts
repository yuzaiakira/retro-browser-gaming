import { db } from "@/lib/db";

/** Load local play timestamps written by Player (`recent:<installationId>`). */
export async function loadRecentPlayMap(): Promise<Map<string, number>> {
  const database = await db();
  const keys = await database.getAllKeys("settings");
  const map = new Map<string, number>();
  for (const key of keys) {
    if (typeof key !== "string" || !key.startsWith("recent:")) continue;
    const value = await database.get("settings", key);
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      map.set(key.slice("recent:".length), value);
    }
  }
  return map;
}

/** Installation ids that have at least one local save-state (any slot). */
export async function loadSavePresence(): Promise<Set<string>> {
  const keys = await (await db()).getAllKeys("saves");
  const ids = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    if (!key.includes(":state:")) continue;
    const releaseId = key.split(":")[0];
    if (releaseId) ids.add(releaseId);
  }
  return ids;
}

export {
  hasSaveForInstall,
  sortContinuePlaying,
  sortReadyNeverPlayed,
} from "./hub-sort";
