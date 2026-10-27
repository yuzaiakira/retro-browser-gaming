export const MANUAL_SLOTS = [0, 1, 2, 3] as const;
export const AUTOSAVE_SLOT = 9;
export const ALL_SLOTS = [...MANUAL_SLOTS, AUTOSAVE_SLOT] as const;

export type SlotKind = "quick" | "manual" | "autosave";

export type SlotStatus = "empty" | "saved" | "corrupt" | "incompatible";

export type SaveSlotInfo = {
  slot: number;
  kind: SlotKind;
  label: string;
  status: SlotStatus;
  createdAt: number | null;
  detail: string;
};

export function kindFor(slot: number): SlotKind {
  if (slot === 0) return "quick";
  if (slot === AUTOSAVE_SLOT) return "autosave";
  return "manual";
}

export function labelFor(slot: number): string {
  if (slot === AUTOSAVE_SLOT) return "Autosave";
  if (slot === 0) return "Quick save";
  return `Slot ${slot + 1}`;
}

export function canLoadSlot(info: SaveSlotInfo): boolean {
  return info.status === "saved";
}
