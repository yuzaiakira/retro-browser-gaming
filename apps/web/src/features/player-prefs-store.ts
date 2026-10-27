import { setting, setSetting } from "@/lib/db";
import { defaultKeys } from "./input";
import {
  DEFAULT_PLAYER_PREFS,
  DEFAULT_SHORTCUTS,
  globalPrefsKey,
  mergePatches,
  mergePlayerPrefs,
  normalizePlayerPrefs,
  parseReleaseOverlay,
  releaseKeymapKey,
  releasePrefsKey,
  sanitizeKeymap,
  toReleaseOverlayRecord,
  type PlayerPrefs,
  type PlayerPrefsPatch,
} from "./player-prefs";

export async function loadGlobalPrefs(): Promise<PlayerPrefs> {
  const raw = await setting<unknown>(globalPrefsKey(), null);
  return normalizePlayerPrefs(raw, DEFAULT_PLAYER_PREFS);
}

/**
 * Sparse per-release overrides only. Missing keys inherit from global.
 * Legacy full snapshots keep every present field as an explicit override.
 */
export async function loadReleasePrefsOverlay(
  releaseId: string,
): Promise<PlayerPrefsPatch | null> {
  const raw = await setting<unknown>(releasePrefsKey(releaseId), null);
  if (raw == null) return null;
  return parseReleaseOverlay(raw);
}

export async function loadEffectivePrefs(
  releaseId: string,
): Promise<PlayerPrefs> {
  const global = await loadGlobalPrefs();
  const overlay = await loadReleasePrefsOverlay(releaseId);
  return mergePlayerPrefs(global, overlay ?? undefined);
}

export async function saveGlobalPrefs(prefs: PlayerPrefs): Promise<void> {
  await setSetting(globalPrefsKey(), normalizePlayerPrefs(prefs));
}

/**
 * @deprecated Prefer patchReleasePrefs — writing a full prefs blob freezes
 * unrelated keys as release overrides. Kept for migration callers only.
 */
export async function saveReleasePrefs(
  releaseId: string,
  prefs: PlayerPrefs,
): Promise<void> {
  // Persist as a full overlay of present fields (legacy-compatible snapshot).
  // New UI paths must use patchReleasePrefs with intentional keys only.
  const patch = parseReleaseOverlay(prefs);
  if (!patch) {
    await clearReleasePrefs(releaseId);
    return;
  }
  const record = toReleaseOverlayRecord(patch);
  await setSetting(releasePrefsKey(releaseId), record);
}

/** Merge intentional keys into the sparse release overlay and persist. */
export async function patchReleasePrefs(
  releaseId: string,
  patch: PlayerPrefsPatch,
): Promise<PlayerPrefsPatch | null> {
  const existing = await loadReleasePrefsOverlay(releaseId);
  const merged = mergePatches(existing, patch);
  const record = toReleaseOverlayRecord(merged);
  await setSetting(releasePrefsKey(releaseId), record);
  return record ? merged : null;
}

export async function clearReleasePrefs(releaseId: string): Promise<void> {
  await setSetting(releasePrefsKey(releaseId), null);
}

export async function resetGlobalPrefs(): Promise<PlayerPrefs> {
  const next = {
    ...DEFAULT_PLAYER_PREFS,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  };
  await saveGlobalPrefs(next);
  return next;
}

export async function loadEffectiveKeymap(
  releaseId: string,
): Promise<Record<string, number>> {
  const global = await setting<Record<string, number>>("keymap", defaultKeys);
  const overlay = await setting<Record<string, number> | null>(
    releaseKeymapKey(releaseId),
    null,
  );
  if (!overlay || typeof overlay !== "object") {
    return sanitizeKeymap(global);
  }
  return sanitizeKeymap({ ...sanitizeKeymap(global), ...overlay });
}
