import { describe, it, expect } from "vitest";
import {
  extractItems,
  extractMeta,
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
