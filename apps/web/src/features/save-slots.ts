import { sha256 } from "hash-wasm";
import { db } from "@/lib/db";
import type { Installation, Save } from "@/lib/types";
import {
  ALL_SLOTS,
  AUTOSAVE_SLOT,
  canLoadSlot,
  kindFor,
  labelFor,
  type SaveSlotInfo,
} from "./save-slot-meta";

export {
  ALL_SLOTS,
  AUTOSAVE_SLOT,
  MANUAL_SLOTS,
  canLoadSlot,
  kindFor,
  labelFor,
  type SaveSlotInfo,
  type SlotKind,
  type SlotStatus,
} from "./save-slot-meta";

function identity(i: Installation, slot: number) {
  return `${i.id}:${i.manifest.core.code}:${i.manifest.core.version}:state:${slot}`;
}

async function inspectSave(
  i: Installation,
  slot: number,
): Promise<SaveSlotInfo> {
  const kind = kindFor(slot);
  const label = labelFor(slot);
  const key = identity(i, slot);
  const value = await (await db()).get("saves", key);
  if (!value) {
    return {
      slot,
      kind,
      label,
      status: "empty",
      createdAt: null,
      detail: "Empty",
    };
  }
  if (
    value.releaseId !== i.id ||
    value.core !== i.manifest.core.code ||
    value.version !== i.manifest.core.version
  ) {
    return {
      slot,
      kind,
      label,
      status: "incompatible",
      createdAt: typeof value.createdAt === "number" ? value.createdAt : null,
      detail: `Incompatible (${value.core}@${value.version})`,
    };
  }
  try {
    const dig = await sha256(value.bytes);
    if (dig !== value.sha256) {
      return {
        slot,
        kind,
        label,
        status: "corrupt",
        createdAt: typeof value.createdAt === "number" ? value.createdAt : null,
        detail: "Checksum failed — backup may remain in IndexedDB",
      };
    }
  } catch {
    return {
      slot,
      kind,
      label,
      status: "corrupt",
      createdAt: typeof value.createdAt === "number" ? value.createdAt : null,
      detail: "Unable to verify save bytes",
    };
  }
  const createdAt =
    typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
      ? value.createdAt
      : null;
  return {
    slot,
    kind,
    label,
    status: "saved",
    createdAt,
    detail: createdAt
      ? `Saved ${new Date(createdAt).toLocaleString()}`
      : "Saved",
  };
}

export async function listSaveSlots(
  installation: Installation,
): Promise<SaveSlotInfo[]> {
  return Promise.all(ALL_SLOTS.map((slot) => inspectSave(installation, slot)));
}

export async function findLatestCompatibleSave(
  installation: Installation,
): Promise<SaveSlotInfo | null> {
  const slots = await listSaveSlots(installation);
  const ok = slots
    .filter((s) => s.status === "saved" && s.createdAt != null)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return ok[0] ?? null;
}

export async function peekSave(
  installation: Installation,
  slot: number,
): Promise<Save | undefined> {
  return (await db()).get("saves", identity(installation, slot));
}
