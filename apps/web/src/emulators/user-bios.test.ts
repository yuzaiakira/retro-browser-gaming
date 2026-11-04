import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  coreRequiresUserBios,
  slotsForCore,
  validateUserBiosFile,
} from "./user-bios";

describe("user-bios validation", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      subtle: {
        digest: async (_algo: string, data: BufferSource) => {
          // Deterministic stub: first 32 bytes of content repeated/padded.
          const src = new Uint8Array(data as ArrayBuffer);
          const out = new Uint8Array(32);
          for (let i = 0; i < 32; i++) out[i] = src[i % Math.max(src.length, 1)] || i;
          return out.buffer;
        },
      },
    });
  });

  it("requires gearcoleco user BIOS", () => {
    expect(coreRequiresUserBios("gearcoleco")).toBe(true);
    expect(slotsForCore("gearcoleco")[0]?.id).toBe("colecovision");
    expect(coreRequiresUserBios("81_eo")).toBe(false);
  });

  it("requires vecx user BIOS (Vectrex executive ROM)", () => {
    expect(coreRequiresUserBios("vecx")).toBe(true);
    expect(slotsForCore("vecx")[0]?.id).toBe("vectrex");
    expect(slotsForCore("vecx")[0]?.preferredFilename).toBe("system.img");
  });

  it("requires FDS BIOS only for .fds launches, never for NES .nes", () => {
    expect(coreRequiresUserBios("fceumm", { entryFile: "demo.fds" })).toBe(true);
    expect(slotsForCore("fceumm", { entryFile: "demo.fds" })[0]?.id).toBe("fds");
    expect(coreRequiresUserBios("fceumm", { entryFile: "cart.nes" })).toBe(false);
    expect(slotsForCore("fceumm", { entryFile: "cart.nes" })).toEqual([]);
    expect(coreRequiresUserBios("fceumm")).toBe(false);
  });

  it("rejects wrong size for colecovision", async () => {
    const file = new File([new Uint8Array(100)], "colecovision.rom");
    const result = await validateUserBiosFile("colecovision", file, {
      core: "gearcoleco",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("BAD_SIZE");
  });

  it("accepts 8192-byte colecovision.rom for gearcoleco", async () => {
    const file = new File([new Uint8Array(8192)], "colecovision.rom");
    const result = await validateUserBiosFile("colecovision", file, {
      core: "gearcoleco",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.byteSize).toBe(8192);
      expect(result.filename).toBe("colecovision.rom");
      expect(result.sha256).toHaveLength(64);
    }
  });

  it("rejects core mismatch", async () => {
    const file = new File([new Uint8Array(8192)], "colecovision.rom");
    const result = await validateUserBiosFile("colecovision", file, {
      core: "fceumm",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_CORE");
  });

  it("rejects unexpected filename", async () => {
    const file = new File([new Uint8Array(8192)], "not-a-bios.bin");
    const result = await validateUserBiosFile("colecovision", file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("BAD_FILENAME");
  });
});
