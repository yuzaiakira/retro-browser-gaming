"use client";

import { useCallback, useEffect, useState } from "react";
import {
  USER_BIOS_SLOTS,
  deleteUserBios,
  getUserBios,
  importUserBios,
  type StoredUserBios,
  type UserBiosSlot,
} from "@/emulators/user-bios";

type RowState = {
  slot: UserBiosSlot;
  stored: StoredUserBios | null;
  message: string;
  busy: boolean;
};

export function UserBiosImporter() {
  const [rows, setRows] = useState<RowState[]>([]);

  const refresh = useCallback(async () => {
    const next: RowState[] = [];
    for (const slot of USER_BIOS_SLOTS.filter((s) => s.enabled)) {
      const stored = await getUserBios(slot.id);
      next.push({ slot, stored, message: "", busy: false });
    }
    setRows(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPick = async (slotId: string, file: File | null) => {
    if (!file) return;
    setRows((prev) =>
      prev.map((r) =>
        r.slot.id === slotId ? { ...r, busy: true, message: "Importing…" } : r,
      ),
    );
    try {
      const stored = await importUserBios(slotId, file);
      setRows((prev) =>
        prev.map((r) =>
          r.slot.id === slotId
            ? {
                ...r,
                stored,
                busy: false,
                message: `Imported ${stored.filename} (${stored.byteSize} bytes).`,
              }
            : r,
        ),
      );
    } catch (error) {
      setRows((prev) =>
        prev.map((r) =>
          r.slot.id === slotId
            ? {
                ...r,
                busy: false,
                message: String(error instanceof Error ? error.message : error),
              }
            : r,
        ),
      );
    }
  };

  const onClear = async (slotId: string) => {
    await deleteUserBios(slotId);
    await refresh();
  };

  if (!rows.length) {
    return (
      <p className="small">No enabled user-BIOS slots in this build.</p>
    );
  }

  return (
    <ul className="user-bios-list">
      {rows.map(({ slot, stored, message, busy }) => (
        <li key={slot.id}>
          <strong>{slot.id}</strong>{" "}
          <span className="small">
            ({slot.cores.join(", ")}) — {slot.preferredFilename}
          </span>
          <p className="small">{slot.notes}</p>
          {stored ? (
            <p className="small">
              Local copy: SHA-256 {stored.sha256.slice(0, 12)}… ·{" "}
              {stored.byteSize} bytes ·{" "}
              <button type="button" onClick={() => void onClear(slot.id)}>
                Remove
              </button>
            </p>
          ) : (
            <p className="small" role="status">
              Missing — gameplay for this core stays blocked until you import
              authorized firmware.
            </p>
          )}
          <label className="small">
            Import {slot.preferredFilename}
            <input
              type="file"
              disabled={busy}
              accept=".rom,.bin"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onPick(slot.id, file);
              }}
            />
          </label>
          {message ? <p className="small">{message}</p> : null}
        </li>
      ))}
    </ul>
  );
}
