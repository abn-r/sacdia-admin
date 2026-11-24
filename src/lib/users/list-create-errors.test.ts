import { describe, expect, it } from "vitest";

import { firstStepWithError, mapCreateUserError } from "@/lib/users/list-create-errors";

describe("mapCreateUserError", () => {
  it("puts a taken email on the email field", () => {
    expect(mapCreateUserError({ status: 409 })).toEqual({ fields: { email: "emailTaken" }, general: false });
  });

  it("puts a forbidden role on the role field", () => {
    expect(mapCreateUserError({ status: 403 }).fields).toEqual({ role: "roleForbidden" });
  });

  it("puts the missing local field on its field", () => {
    const map = mapCreateUserError({ status: 400, payload: { code: "ADMIN_USER_LOCAL_FIELD_REQUIRED" } });
    expect(map.fields).toEqual({ local_field_id: "localFieldRequired" });
  });

  it("maps validation errors by field name, reducing nested paths", () => {
    const map = mapCreateUserError({
      status: 400,
      payload: {
        code: "VALIDATION_FAILED",
        errors: [
          { field: "email", message: "x" },
          { field: "union_id", message: "y" },
          { field: "unknown_field", message: "z" },
          { field: "name[0]", message: "w" },
        ],
      },
    });
    expect(map.fields).toEqual({ email: "emailInvalid", union_id: "invalidField", name: "invalidField" });
    expect(map.general).toBe(false);
  });

  it("falls back to a general error when no field can be named", () => {
    expect(mapCreateUserError({ status: 400, payload: { errors: [{ field: "zzz" }] } }).general).toBe(true);
    expect(mapCreateUserError({ status: 500 })).toEqual({ fields: {}, general: true });
  });
});

describe("firstStepWithError", () => {
  it("returns the earliest step holding an error", () => {
    expect(firstStepWithError({ role: "roleForbidden", email: "emailTaken" })).toBe(0);
    expect(firstStepWithError({ union_id: "invalidField" })).toBe(1);
    expect(firstStepWithError({})).toBeNull();
  });
});
