import { db } from "@/lib/db";

/** Load local play timestamps written by Player (`recent:<installationId>`). */
export async function loadRecentPlayMap(): Promise<Map<string, number>> {
  const database = await db();
  const keys = await database.getAllKeys("settings");
  const map = new Map<string, number>();
  for (const key of keys) {
    if (typeof key !== "string" || !key.startsWith("recent:")) continue;
    const value = await database.get("settings", key);
    if (typeof value === "number" && Number.isFinite(value)) {
      map.set(key.slice("recent:".length), value);
    }
  }
  return map;
}

export { sortContinuePlaying } from "./hub-sort";
