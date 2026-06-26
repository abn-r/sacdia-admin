import { describe, expect, it } from "vitest";
import { resolveInitialLocalFieldId } from "./ranking-defaults";
import type { LocalField } from "@/lib/api/geography";
import type { AuthUser } from "@/lib/auth/types";

const LOCAL_FIELDS: LocalField[] = [
  { local_field_id: 10, name: "Centro Veracruz", union_id: 1, active: true },
  { local_field_id: 20, name: "Norte", union_id: 1, active: true },
];

describe("resolveInitialLocalFieldId", () => {
  it("prefers the authenticated user's effective local field scope when available", () => {
    const user: AuthUser = {
      id: "user-id",
      email: "director@example.com",
      authorization: {
        effective: {
          scope: {
            global: {
              local_field: { id: 20, name: "Norte" },
            },
          },
        },
      },
    };

    expect(resolveInitialLocalFieldId(user, LOCAL_FIELDS)).toBe(20);
  });

  it("falls back to the first catalog local field when the user scope is absent or unavailable", () => {
    const user: AuthUser = {
      id: "user-id",
      email: "admin@example.com",
      authorization: {
        effective: {
          scope: {
            global: {
              local_field: { id: 999, name: "Fuera de catálogo" },
            },
          },
        },
      },
    };

    expect(resolveInitialLocalFieldId(user, LOCAL_FIELDS)).toBe(10);
  });
});
