import { describe, it, expect } from "vitest";
import {
  extractItems,
  extractMeta,
  paginateInMemory,
  paginateLoadedItems,
  readParam,
  readPositiveNumberParam,
} from "./fetch-helpers";

// ─── extractItems ─────────────────────────────────────────────────────────────

describe("extractItems()", () => {
  it("returns the array directly when the payload is already an array", () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(extractItems(items)).toEqual(items);
  });

  it("extracts items from { data: [...] }", () => {
    const payload = { data: [{ id: 1 }] };
    expect(extractItems(payload)).toEqual([{ id: 1 }]);
  });

  it("extracts items from nested { data: { data: [...] } }", () => {
    const payload = { data: { data: [{ id: 2 }] } };
    expect(extractItems(payload)).toEqual([{ id: 2 }]);
  });

  it("extracts items from nested { data: { items: [...] } }", () => {
    const payload = { data: { items: [{ id: 3 }] } };
    expect(extractItems(payload)).toEqual([{ id: 3 }]);
  });

  it("returns an empty array for null/undefined input", () => {
    expect(extractItems(null)).toEqual([]);
    expect(extractItems(undefined)).toEqual([]);
  });

  it("returns an empty array for an unrecognised shape", () => {
    expect(extractItems({ foo: "bar" })).toEqual([]);
  });
});

// ─── extractMeta ──────────────────────────────────────────────────────────────

describe("extractMeta()", () => {
  it("uses fallback values when payload has no meta", () => {
    const result = extractMeta(null, 1, 20, 0);
    expect(result).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });

  it("reads page/limit/total from root meta object", () => {
    const payload = { meta: { page: 2, limit: 10, total: 30 } };
    const result = extractMeta(payload, 1, 20, 0);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(30);
  });

  it("reads meta from nested data.meta", () => {
    const payload = { data: { meta: { page: 3, limit: 5, total: 15, totalPages: 3 } } };
    const result = extractMeta(payload, 1, 20, 0);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  it("derives totalPages from total/limit when not present in response", () => {
    const payload = { meta: { page: 1, limit: 10, total: 25 } };
    const result = extractMeta(payload, 1, 10, 0);
    expect(result.totalPages).toBe(3); // ceil(25/10)
  });

  it("accepts 'count' as alias for total", () => {
    const payload = { meta: { page: 1, limit: 10, count: 40 } };
    const result = extractMeta(payload, 1, 10, 0);
    expect(result.total).toBe(40);
  });
});

// ─── readParam ────────────────────────────────────────────────────────────────

describe("readParam()", () => {
  it("returns the string value for a plain string param", () => {
    expect(readParam({ page: "2" }, "page")).toBe("2");
  });

  it("returns the first string element for an array param", () => {
    expect(readParam({ tag: ["a", "b"] }, "tag")).toBe("a");
  });

  it("returns undefined for a missing key", () => {
    expect(readParam({}, "missing")).toBeUndefined();
  });

  it("returns undefined when value is explicitly undefined", () => {
    expect(readParam({ key: undefined }, "key")).toBeUndefined();
  });
});

// ─── readPositiveNumberParam ──────────────────────────────────────────────────

describe("readPositiveNumberParam()", () => {
  it("parses a numeric string to a positive number", () => {
    expect(readPositiveNumberParam({ page: "3" }, "page")).toBe(3);
  });

  it("returns undefined for zero", () => {
    expect(readPositiveNumberParam({ limit: "0" }, "limit")).toBeUndefined();
  });

  it("returns undefined for a negative string", () => {
    expect(readPositiveNumberParam({ page: "-1" }, "page")).toBeUndefined();
  });

  it("returns undefined for a non-numeric string", () => {
    expect(readPositiveNumberParam({ page: "abc" }, "page")).toBeUndefined();
  });

  it("returns undefined for a missing key", () => {
    expect(readPositiveNumberParam({}, "page")).toBeUndefined();
  });
});

// ─── paginateInMemory ─────────────────────────────────────────────────────────

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe("paginateInMemory()", () => {
  it("returns only the rows of the requested page", () => {
    const result = paginateInMemory(rows(384), 2, 20);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toEqual({ id: 21 });
    expect(result.items[19]).toEqual({ id: 40 });
    expect(result.meta).toEqual({ page: 2, limit: 20, total: 384, totalPages: 20 });
  });

  it("returns a short last page", () => {
    const result = paginateInMemory(rows(45), 3, 20);
    expect(result.items.map((r) => r.id)).toEqual([41, 42, 43, 44, 45]);
    expect(result.meta.totalPages).toBe(3);
  });

  it("clamps a page beyond the end to the last page", () => {
    const result = paginateInMemory(rows(45), 99, 20);
    expect(result.meta.page).toBe(3);
    expect(result.items).toHaveLength(5);
  });

  it("clamps page and limit to sane minimums", () => {
    const result = paginateInMemory(rows(3), 0, 0);
    expect(result.meta).toEqual({ page: 1, limit: 1, total: 3, totalPages: 3 });
    expect(result.items).toEqual([{ id: 1 }]);
  });

  it("handles an empty list", () => {
    const result = paginateInMemory([], 1, 20);
    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});

// ─── paginateLoadedItems ──────────────────────────────────────────────────────

describe("paginateLoadedItems()", () => {
  it("cuts the page when the API ignored page/limit and returned a bare list", () => {
    const all = rows(384);
    const result = paginateLoadedItems(all, all, 1, 20);
    expect(result.items).toHaveLength(20);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 384, totalPages: 20 });
  });

  it("cuts the page when the API wraps the full list in data without meta", () => {
    const all = rows(99);
    const result = paginateLoadedItems(all, { data: all }, 5, 20);
    expect(result.items.map((r) => r.id)).toEqual([81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
    expect(result.meta.page).toBe(5);
    expect(result.meta.totalPages).toBe(5);
  });

  it("cuts the page when the API reports a total equal to the full list it returned", () => {
    const all = rows(60);
    const result = paginateLoadedItems(all, { data: all, meta: { total: 60 } }, 2, 20);
    expect(result.items[0]).toEqual({ id: 21 });
    expect(result.items).toHaveLength(20);
  });

  it("passes server-paginated responses through untouched", () => {
    const pageItems = rows(20);
    const payload = { data: pageItems, meta: { page: 3, limit: 20, total: 384, totalPages: 20 } };
    const result = paginateLoadedItems(pageItems, payload, 3, 20);
    expect(result.items).toBe(pageItems);
    expect(result.meta).toEqual({ page: 3, limit: 20, total: 384, totalPages: 20 });
  });

  it("keeps a short list intact", () => {
    const all = rows(7);
    const result = paginateLoadedItems(all, all, 1, 20);
    expect(result.items).toHaveLength(7);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 7, totalPages: 1 });
  });

  it("paginates the filtered list, not the raw payload", () => {
    const raw = rows(100);
    const filtered = raw.filter((r) => r.id % 2 === 0); // 50 rows after a local filter
    const result = paginateLoadedItems(filtered, raw, 1, 20);
    expect(result.meta.total).toBe(50);
    expect(result.meta.totalPages).toBe(3);
    expect(result.items).toHaveLength(20);
  });
});
