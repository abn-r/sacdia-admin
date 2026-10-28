import { describe, expect, it } from "vitest";
import { isRoleNameValidationError, validateRoleName } from "./role-name";

describe("validateRoleName (mirrors backend CreateRoleDto)", () => {
  it.each(["club-director", "abc", "a-b", "tesorero-de-club"])("accepts %s", (name) => {
    expect(validateRoleName(name)).toBeNull();
  });

  it.each([
    ["role-1", "digits"],
    ["1role", "leading digit"],
    ["-role", "leading hyphen"],
    ["role-", "trailing hyphen"],
    ["Role", "uppercase"],
    ["ab", "shorter than 3"],
    ["role_name", "underscore"],
    ["role name", "space"],
    ["a".repeat(65), "longer than 64"],
  ])("rejects %s (%s)", (name) => {
    expect(validateRoleName(name)).toBe("format");
  });

  it("requires a value", () => {
    expect(validateRoleName("")).toBe("required");
  });

  it("reserves super-admin", () => {
    expect(validateRoleName("super-admin")).toBe("reserved");
  });
});

describe("isRoleNameValidationError", () => {
  const msg =
    "role_name debe contener solo letras minúsculas y guiones (no puede empezar ni terminar con guión)";

  it("detects a 400 whose message mentions role_name", () => {
    expect(isRoleNameValidationError({ status: 400, message: msg, payload: null })).toBe(true);
  });

  it("detects role_name inside an array payload message", () => {
    expect(
      isRoleNameValidationError({ status: 400, message: "Bad Request", payload: { message: [msg] } }),
    ).toBe(true);
  });

  it("ignores other statuses and unrelated errors", () => {
    expect(isRoleNameValidationError({ status: 500, message: msg })).toBe(false);
    expect(isRoleNameValidationError({ status: 400, message: "description too short" })).toBe(false);
    expect(isRoleNameValidationError(new Error(msg))).toBe(false);
    expect(isRoleNameValidationError(null)).toBe(false);
  });
});
