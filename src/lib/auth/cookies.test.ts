import { describe, it, expect } from "vitest";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookies";

// cookies.ts is a pure constants file — no server-side bindings.
// Tests verify the exact string values that the rest of the auth system
// depends on. Changing them is a breaking change (live sessions invalidated).

describe("cookie name constants", () => {
  it("ACCESS_TOKEN_COOKIE is the canonical access-token cookie name", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("sacdia_admin_access_token");
  });

  it("REFRESH_TOKEN_COOKIE is the canonical refresh-token cookie name", () => {
    expect(REFRESH_TOKEN_COOKIE).toBe("sacdia_admin_refresh_token");
  });

  it("both constants are non-empty strings", () => {
    expect(typeof ACCESS_TOKEN_COOKIE).toBe("string");
    expect(ACCESS_TOKEN_COOKIE.length).toBeGreaterThan(0);
    expect(typeof REFRESH_TOKEN_COOKIE).toBe("string");
    expect(REFRESH_TOKEN_COOKIE.length).toBeGreaterThan(0);
  });

  it("both constants are distinct (no accidental aliasing)", () => {
    expect(ACCESS_TOKEN_COOKIE).not.toBe(REFRESH_TOKEN_COOKIE);
  });

  it("constant names follow the sacdia_admin_ namespace prefix", () => {
    expect(ACCESS_TOKEN_COOKIE.startsWith("sacdia_admin_")).toBe(true);
    expect(REFRESH_TOKEN_COOKIE.startsWith("sacdia_admin_")).toBe(true);
  });

  it("constant values contain only lowercase letters, digits, and underscores (cookie-safe)", () => {
    const cookieSafe = /^[a-z0-9_]+$/;
    expect(cookieSafe.test(ACCESS_TOKEN_COOKIE)).toBe(true);
    expect(cookieSafe.test(REFRESH_TOKEN_COOKIE)).toBe(true);
  });
});
