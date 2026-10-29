import { describe, expect, it } from "vitest";
import {
  decodeCsv,
  isCsvFile,
  matchCatalogName,
  normalizeName,
} from "@/lib/clubs/bulk-import-parse";

const encoder = new TextEncoder();

describe("normalizeName", () => {
  it("ignores case, accents and outer spaces", () => {
    expect(normalizeName("  Asociación Centro  ")).toBe("asociacion centro");
    expect(normalizeName("ASOCIACIÓN CENTRO")).toBe("asociacion centro");
  });
});

describe("decodeCsv", () => {
  it("reads UTF-8 without BOM", () => {
    const bytes = encoder.encode("name\nAsociación");
    expect(decodeCsv(bytes.buffer as ArrayBuffer)).toBe("name\nAsociación");
  });

  it("drops the UTF-8 BOM", () => {
    const bytes = encoder.encode("﻿name");
    expect(decodeCsv(bytes.buffer as ArrayBuffer)).toBe("name");
  });

  it("falls back to Windows-1252 for Excel CSV files", () => {
    // "Asociación" in Windows-1252: ó = 0xF3, invalid as UTF-8.
    const bytes = new Uint8Array([0x41, 0x73, 0x6f, 0x63, 0x69, 0x61, 0x63, 0x69, 0xf3, 0x6e]);
    expect(decodeCsv(bytes.buffer)).toBe("Asociación");
  });
});

describe("isCsvFile", () => {
  it("detects CSV by type or extension", () => {
    expect(isCsvFile({ name: "clubs.CSV", type: "" })).toBe(true);
    expect(isCsvFile({ name: "x", type: "text/csv" })).toBe(true);
    expect(isCsvFile({ name: "clubs.xlsx", type: "" })).toBe(false);
  });
});

describe("matchCatalogName", () => {
  const districts = [
    { label: "Centro", value: 1, parentId: 4 },
    { label: "Centro", value: 2, parentId: 5 },
    { label: "Catemaco", value: 3, parentId: 5 },
  ];

  it("reports a missing value", () => {
    expect(matchCatalogName("  ", districts)).toEqual({ ok: false, reason: "missing" });
  });

  it("reports an unknown name", () => {
    expect(matchCatalogName("Norte", districts, 4)).toEqual({ ok: false, reason: "unknown" });
  });

  it("picks the entry under the given parent when names repeat", () => {
    expect(matchCatalogName("centro", districts, 5)).toEqual({ ok: true, id: 2 });
  });

  it("reports a name that only exists under another parent", () => {
    expect(matchCatalogName("Catemaco", districts, 4)).toEqual({
      ok: false,
      reason: "outsideParent",
    });
  });

  it("matches by name alone without a parent", () => {
    expect(matchCatalogName("CATEMACO", districts)).toEqual({ ok: true, id: 3 });
  });
});
