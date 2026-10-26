import type { Installation } from "@/lib/types";

/** Ready installs ordered by genuine local play history, then verifiedAt. */
export function sortContinuePlaying(
  installs: Installation[],
  recent: Map<string, number>,
  limit = 6,
): Installation[] {
  return [...installs]
    .filter((i) => i.state === "ready-offline")
    .sort((a, b) => {
      const ra = recent.get(a.id) ?? 0;
      const rb = recent.get(b.id) ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.verifiedAt || 0) - (a.verifiedAt || 0);
    })
    .slice(0, limit);
}
