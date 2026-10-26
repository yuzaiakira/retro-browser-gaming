import { describe, expect, it } from "vitest";
import { sortContinuePlaying } from "./hub-sort";
import type { Installation } from "@/lib/types";

function install(
  id: string,
  verifiedAt: number,
  state: Installation["state"] = "ready-offline",
): Installation {
  return {
    id,
    state,
    verifiedAt,
    shellVersion: "1",
    game: {
      id: "g-" + id,
      slug: id,
      title: id,
      description: "d",
      genre: "Arcade",
      releases: [],
    },
    release: {
      id,
      console: { id: "c", slug: "browser", name: "HTML5", status: "available" },
      region: "WW",
      revision: "1",
      recommended_core: {
        id: "core",
        code: "native-html",
        version: "1",
        status: "ok",
        runtime_type: "native",
        min_capabilities: [],
        supported_extensions: [],
        licensed_asset_manifest: [],
      },
      status: "ready",
      compatibility_note: "",
    },
    manifest: {
      manifestVersion: 1,
      releaseId: id,
      revision: "1",
      core: { code: "native-html", version: "1" },
      assets: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          role: "rom",
          filename: "x.bin",
          url: "https://example.test/x.bin",
          byteSize: 1,
          sha256: "a".repeat(64),
          version: "1",
          rangeSupported: true,
        },
      ],
      requiredFiles: [],
      entryFile: "index.html",
      offlineRequirements: [],
      requiredCapabilities: [],
    },
  };
}

describe("sortContinuePlaying", () => {
  it("orders by recent play timestamps before verifiedAt", () => {
    const a = install("a", 100);
    const b = install("b", 200);
    const c = install("c", 300);
    const recent = new Map([
      ["a", 50],
      ["c", 90],
    ]);
    expect(sortContinuePlaying([a, b, c], recent, 3).map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("excludes non-ready installs", () => {
    const ready = install("ok", 1);
    const missing = install("bad", 2, "missing");
    expect(
      sortContinuePlaying([ready, missing], new Map()).map((i) => i.id),
    ).toEqual(["ok"]);
  });
});
