import { describe, expect, it } from "vitest";

import { checkNewPassword, passwordRequirements } from "./password-policy";

const met = (value: string) =>
  Object.fromEntries(passwordRequirements(value).map((r) => [r.id, r.met]));

describe("passwordRequirements", () => {
  it("marks nothing for an empty password", () => {
    expect(met("")).toEqual({ length: false, case: false, number: false, special: false });
  });

  it("marks each rule as it is satisfied", () => {
    expect(met("Hola")).toEqual({ length: false, case: true, number: false, special: false });
    expect(met("hola1")).toMatchObject({ case: false, number: true });
    expect(met("hola!")).toMatchObject({ special: true });
    expect(met("abcdefghijkl")).toMatchObject({ length: true, case: false });
  });

  it("requires both cases on the same line", () => {
    expect(met("SOLOMAYUS")).toMatchObject({ case: false });
    expect(met("soloMinus")).toMatchObject({ case: true });
  });

  it("is all met exactly when checkNewPassword accepts it", () => {
    const valid = "Sacdia2026!ok";
    expect(passwordRequirements(valid).every((r) => r.met)).toBe(true);
    expect(checkNewPassword(valid)).toBeNull();
  });

  it("does not count a password over the maximum length", () => {
    expect(met("A" + "a1!".repeat(43))).toMatchObject({ length: false });
  });
});
