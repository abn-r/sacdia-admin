import { describe, expect, it } from "vitest";
import { usersScopeTypeMessageKey } from "./scope-type-label";

describe("usersScopeTypeMessageKey", () => {
  it("maps LOCAL_FIELD to a translation key, not the raw enum", () => {
    expect(usersScopeTypeMessageKey("LOCAL_FIELD")).toBe(
      "filters.scopeTypes.LOCAL_FIELD",
    );
    expect(usersScopeTypeMessageKey("LOCAL_FIELD")).not.toBe("LOCAL_FIELD");
    expect(usersScopeTypeMessageKey("LOCAL_FIELD")).not.toBe("Local_field");
  });

  it("maps the other users-list scope enums to translation keys", () => {
    expect(usersScopeTypeMessageKey("UNION")).toBe("filters.scopeTypes.UNION");
    expect(usersScopeTypeMessageKey("DIVISION")).toBe(
      "filters.scopeTypes.DIVISION",
    );
    expect(usersScopeTypeMessageKey("ALL")).toBe("filters.scopeTypes.ALL");
  });

  it("returns null for missing or unknown values instead of dumping the token", () => {
    expect(usersScopeTypeMessageKey(undefined)).toBeNull();
    expect(usersScopeTypeMessageKey(null)).toBeNull();
    expect(usersScopeTypeMessageKey("ASSOCIATION")).toBeNull();
  });
});
