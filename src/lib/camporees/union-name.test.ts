import { describe, expect, it, vi } from "vitest";
import {
  readUnionIdFromCamporee,
  readUnionNameFromCamporee,
  resolveUnionCamporeeUnionName,
} from "./union-name";

describe("readUnionNameFromCamporee", () => {
  it("reads the embedded `unions` relation returned by GET /camporees/union/:id", () => {
    expect(
      readUnionNameFromCamporee({ union_id: 4, unions: { union_id: 4, name: "Unión Mexicana del Norte" } }),
    ).toBe("Unión Mexicana del Norte");
  });

  it("reads a flat union_name or a `union` object", () => {
    expect(readUnionNameFromCamporee({ union_name: "Unión Sur" })).toBe("Unión Sur");
    expect(readUnionNameFromCamporee({ union: { name: "Unión Este" } })).toBe("Unión Este");
  });

  it("ignores blank names", () => {
    expect(readUnionNameFromCamporee({ union_name: "  ", unions: { name: "" } })).toBeNull();
    expect(readUnionNameFromCamporee({})).toBeNull();
  });
});

describe("readUnionIdFromCamporee", () => {
  it("prefers the flat column and falls back to the relation", () => {
    expect(readUnionIdFromCamporee({ union_id: 7 })).toBe(7);
    expect(readUnionIdFromCamporee({ unions: { union_id: 9, name: "X" } })).toBe(9);
    expect(readUnionIdFromCamporee({ union_id: null })).toBeNull();
  });
});

describe("resolveUnionCamporeeUnionName", () => {
  const catalog = [
    { union_id: 1, name: "Unión A" },
    { union_id: 4, name: "Unión Mexicana del Norte" },
  ];

  it("does not hit the catalog when the payload already has the name", async () => {
    const load = vi.fn(async () => catalog);
    const name = await resolveUnionCamporeeUnionName({ unions: { name: "Desde payload" } }, load);
    expect(name).toBe("Desde payload");
    expect(load).not.toHaveBeenCalled();
  });

  it("looks the name up by union_id when the payload only has the id", async () => {
    const name = await resolveUnionCamporeeUnionName({ union_id: 4 }, async () => catalog);
    expect(name).toBe("Unión Mexicana del Norte");
  });

  it("returns null when the union is unknown or the catalog fails", async () => {
    expect(await resolveUnionCamporeeUnionName({ union_id: 99 }, async () => catalog)).toBeNull();
    expect(
      await resolveUnionCamporeeUnionName({ union_id: 4 }, async () => {
        throw new Error("boom");
      }),
    ).toBeNull();
    expect(await resolveUnionCamporeeUnionName({}, async () => catalog)).toBeNull();
  });
});
