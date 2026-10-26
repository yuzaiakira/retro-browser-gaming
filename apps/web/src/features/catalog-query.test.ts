import { describe, expect, it } from "vitest";
import {
  buildCatalogPath,
  catalogQueriesEqual,
  normalizePage,
  parseCatalogQuery,
} from "./catalog-query";

describe("catalog-query", () => {
  it("normalizes invalid page values", () => {
    expect(normalizePage("0")).toBe(1);
    expect(normalizePage("-3")).toBe(1);
    expect(normalizePage("abc")).toBe(1);
    expect(normalizePage("2.9")).toBe(2);
    expect(normalizePage(99999)).toBe(9999);
  });

  it("round-trips filter state in the path", () => {
    const query = parseCatalogQuery("q=Orbit&console=browser&genre=Arcade&page=2");
    expect(query).toEqual({
      search: "Orbit",
      consoleFilter: "browser",
      genreFilter: "Arcade",
      pageNumber: 2,
    });
    expect(buildCatalogPath(query)).toBe(
      "/games?q=Orbit&console=browser&genre=Arcade&page=2",
    );
  });

  it("omits empty defaults from the path", () => {
    expect(
      buildCatalogPath({
        search: "",
        consoleFilter: "",
        genreFilter: "",
        pageNumber: 1,
      }),
    ).toBe("/games");
  });

  it("compares queries for history de-dupe", () => {
    const a = parseCatalogQuery("q=a");
    const b = parseCatalogQuery("q=a");
    const c = parseCatalogQuery("q=b");
    expect(catalogQueriesEqual(a, b)).toBe(true);
    expect(catalogQueriesEqual(a, c)).toBe(false);
  });
});
