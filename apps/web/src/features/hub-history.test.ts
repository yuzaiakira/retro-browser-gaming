import { describe, expect, it } from "vitest";
import {
  hasSaveForInstall,
  sortContinuePlaying,
  sortReadyNeverPlayed,
} from "./hub-sort";
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
  it("only includes installs with genuine recent play timestamps", () => {
    const a = install("a", 100);
    const b = install("b", 999);
    const c = install("c", 300);
    const recent = new Map([
      ["a", 50],
      ["c", 90],
    ]);
    expect(sortContinuePlaying([a, b, c], recent, 6).map((i) => i.id)).toEqual([
      "c",
      "a",
    ]);
  });

  it("excludes never-played ready installs from Continue Playing", () => {
    const ready = install("ok", 1);
    expect(sortContinuePlaying([ready], new Map()).map((i) => i.id)).toEqual([]);
  });
});

describe("sortReadyNeverPlayed", () => {
  it("lists ready installs without recent timestamps", () => {
    const played = install("played", 1);
    const fresh = install("fresh", 2);
    const recent = new Map([["played", 10]]);
    expect(
      sortReadyNeverPlayed([played, fresh], recent).map((i) => i.id),
    ).toEqual(["fresh"]);
  });
});

describe("hasSaveForInstall", () => {
  it("detects save-state keys for an installation", () => {
    const keys = [
      "abc:native-html:1:state:0",
      "other:native-html:1:state:9",
    ];
    expect(hasSaveForInstall("abc", keys)).toBe(true);
    expect(hasSaveForInstall("missing", keys)).toBe(false);
  });
});
