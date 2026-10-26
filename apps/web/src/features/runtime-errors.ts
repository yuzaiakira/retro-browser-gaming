/** User-facing guidance when emulator core binaries fail to load. */

export function isMissingRuntimeError(raw: string): boolean {
  return (
    /Failed to fetch|404|Load failed|net::ERR|wasm|\.data/i.test(raw) ||
    /Core not authorized for public browser distribution/i.test(raw) ||
    /beacuse it's likly that the minified files are missing/i.test(raw)
  );
}

export function missingRuntimeMessage(raw: string): string {
  return (
    "Emulator core files are missing or not available in this deployment. " +
    "Public builds only serve allowlisted cores; source-only clones need an authorized " +
    "private-asset import (LOCAL_FULL). Experimental cores such as 81_eo and " +
    "virtualjaguar_js stay blocked until corresponding source is complete. " +
    "Open Diagnostics for Alpha limits and licensing notes. " +
    "Details: " +
    raw
  );
}
