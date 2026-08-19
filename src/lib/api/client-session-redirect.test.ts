import { describe, expect, it } from "vitest";
import { shouldRedirectToLoginOnApiError } from "@/lib/api/client";

describe("shouldRedirectToLoginOnApiError", () => {
  it("redirige solo en 401", () => {
    expect(shouldRedirectToLoginOnApiError(401)).toBe(true);
  });

  it("no trata 403 de permiso como sesión caducada", () => {
    expect(shouldRedirectToLoginOnApiError(403)).toBe(false);
    expect(shouldRedirectToLoginOnApiError(400)).toBe(false);
  });
});
