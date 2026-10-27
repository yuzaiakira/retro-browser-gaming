import { setting, setSetting } from "@/lib/db";
import { defaultKeys } from "./input";
import {
  DEFAULT_PLAYER_PREFS,
  DEFAULT_SHORTCUTS,
  globalPrefsKey,
  mergePlayerPrefs,
  normalizePlayerPrefs,
  releaseKeymapKey,
  releasePrefsKey,
  sanitizeKeymap,
  type PlayerPrefs,
  type PlayerPrefsPatch,
} from "./player-prefs";

export async function loadGlobalPrefs(): Promise<PlayerPrefs> {
  const raw = await setting<unknown>(globalPrefsKey(), null);
  return normalizePlayerPrefs(raw, DEFAULT_PLAYER_PREFS);
}

export async function loadReleasePrefsOverlay(
  releaseId: string,
): Promise<PlayerPrefsPatch | null> {
  const raw = await setting<unknown>(releasePrefsKey(releaseId), null);
  if (raw == null) return null;
  return normalizePlayerPrefs(raw, DEFAULT_PLAYER_PREFS);
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

export async function saveReleasePrefs(
  releaseId: string,
  prefs: PlayerPrefs,
): Promise<void> {
  await setSetting(releasePrefsKey(releaseId), normalizePlayerPrefs(prefs));
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
