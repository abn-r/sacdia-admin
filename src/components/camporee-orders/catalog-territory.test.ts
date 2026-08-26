import { describe, expect, it } from "vitest";
import { buildCatalogCreateOwnerFields } from "./catalog-territory";

describe("buildCatalogCreateOwnerFields", () => {
  it("returns null for unconfigured and open actors", () => {
    expect(buildCatalogCreateOwnerFields({ level: "unconfigured" })).toBeNull();
    expect(buildCatalogCreateOwnerFields({ level: "open" })).toBeNull();
  });

  it("uses the locked division for division actors and ignores hints", () => {
    expect(
      buildCatalogCreateOwnerFields(
        { level: "division", divisionId: 4 },
        { scope: "UNION", ownerId: 8 },
      ),
    ).toEqual({ owner_scope: "DIVISION", owner_division_id: 4 });
  });

  it("uses the locked union for union actors", () => {
    expect(
      buildCatalogCreateOwnerFields({ level: "union", unionId: 8 }),
    ).toEqual({ owner_scope: "UNION", owner_union_id: 8 });
  });

  it("uses the locked local field for local_field actors", () => {
    expect(
      buildCatalogCreateOwnerFields({
        level: "local_field",
        localFieldId: 7,
      }),
    ).toEqual({
      owner_scope: "LOCAL_FIELD",
      owner_local_field_id: 7,
    });
  });

  it("returns null when a territorial actor is missing its geography id", () => {
    expect(buildCatalogCreateOwnerFields({ level: "division" })).toBeNull();
    expect(buildCatalogCreateOwnerFields({ level: "union" })).toBeNull();
    expect(buildCatalogCreateOwnerFields({ level: "local_field" })).toBeNull();
  });

  it("requires a matching owner id for platform admin (level all)", () => {
    expect(buildCatalogCreateOwnerFields({ level: "all" })).toBeNull();
    expect(
      buildCatalogCreateOwnerFields(
        { level: "all" },
        { scope: "DIVISION", ownerId: 0 },
      ),
    ).toBeNull();
    expect(
      buildCatalogCreateOwnerFields(
        { level: "all" },
        { scope: "DIVISION", ownerId: 4 },
      ),
    ).toEqual({ owner_scope: "DIVISION", owner_division_id: 4 });
    expect(
      buildCatalogCreateOwnerFields(
        { level: "all" },
        { scope: "UNION", ownerId: 8 },
      ),
    ).toEqual({ owner_scope: "UNION", owner_union_id: 8 });
    expect(
      buildCatalogCreateOwnerFields(
        { level: "all" },
        { scope: "LOCAL_FIELD", ownerId: 7 },
      ),
    ).toEqual({
      owner_scope: "LOCAL_FIELD",
      owner_local_field_id: 7,
    });
  });
});
