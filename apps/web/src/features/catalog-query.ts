export type CatalogQuery = {
  search: string;
  consoleFilter: string;
  genreFilter: string;
  pageNumber: number;
};

export function normalizePage(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 9999);
}

export function parseCatalogQuery(
  searchParams: URLSearchParams | string,
): CatalogQuery {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams;
  return {
    search: (params.get("q") || params.get("search") || "").trim(),
    consoleFilter: params.get("console") || "",
    genreFilter: params.get("genre") || "",
    pageNumber: normalizePage(params.get("page") || 1),
  };
}

export function buildCatalogPath(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.consoleFilter) params.set("console", query.consoleFilter);
  if (query.genreFilter) params.set("genre", query.genreFilter);
  if (query.pageNumber > 1) params.set("page", String(query.pageNumber));
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}

export function catalogQueriesEqual(a: CatalogQuery, b: CatalogQuery): boolean {
  return (
    a.search === b.search &&
    a.consoleFilter === b.consoleFilter &&
    a.genreFilter === b.genreFilter &&
    a.pageNumber === b.pageNumber
  );
}
