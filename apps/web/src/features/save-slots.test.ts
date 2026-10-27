import { describe, expect, it } from "vitest";
import {
  ALL_SLOTS,
  AUTOSAVE_SLOT,
  canLoadSlot,
  type SaveSlotInfo,
} from "./save-slot-meta";

describe("save-slot-meta", () => {
  it("keeps quick/manual/autosave numbering", () => {
    expect(ALL_SLOTS).toEqual([0, 1, 2, 3, 9]);
    expect(AUTOSAVE_SLOT).toBe(9);
  });

  it("only loads verified saved slots", () => {
    const empty: SaveSlotInfo = {
      slot: 1,
      kind: "manual",
      label: "Slot 2",
      status: "empty",
      createdAt: null,
      detail: "Empty",
    };
    const saved: SaveSlotInfo = {
      ...empty,
      status: "saved",
      createdAt: 1,
      detail: "Saved",
    };
    const corrupt: SaveSlotInfo = { ...empty, status: "corrupt", detail: "bad" };
    expect(canLoadSlot(empty)).toBe(false);
    expect(canLoadSlot(saved)).toBe(true);
    expect(canLoadSlot(corrupt)).toBe(false);
  });
});
