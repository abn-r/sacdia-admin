import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: cookieSet, get: () => undefined })),
}));

// One preference of each persistence that matters, so the test does not
// depend on which real preferences happen to use "server-cookie" today.
vi.mock("@/lib/preferences/preferences-config", () => {
  const PREFERENCE_REGISTRY = {
    server_pref: { values: ["a", "b"], defaultValue: "a", persistence: "server-cookie" },
    client_pref: { values: ["x", "y"], defaultValue: "x", persistence: "client-cookie" },
  };
  return {
    PREFERENCE_REGISTRY,
    getPreferencePersistence: (key: keyof typeof PREFERENCE_REGISTRY) =>
      PREFERENCE_REGISTRY[key].persistence,
    parsePreference: vi.fn(),
  };
});

import * as serverActions from "./server-actions";

beforeEach(() => {
  cookieSet.mockClear();
});

describe("server-actions cookie access", () => {
  it("does not export a generic cookie reader or writer", () => {
    expect(serverActions).not.toHaveProperty("getValueFromCookie");
    expect(serverActions).not.toHaveProperty("setValueToCookie");
  });

  it("writes a registered server-cookie preference with an allowed value", async () => {
    await serverActions.setPreferenceCookie("server_pref", "b");

    expect(cookieSet).toHaveBeenCalledWith(
      "server_pref",
      "b",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it.each([
    ["an auth cookie", "sacdia_admin_access_token", "forged"],
    ["an auth refresh cookie", "sacdia_admin_refresh_token", "forged"],
    ["an unknown key", "anything", "a"],
    ["an inherited object key", "__proto__", "a"],
    ["a client-cookie preference", "client_pref", "y"],
    ["a value outside the allowed set", "server_pref", "c"],
  ])("ignores %s", async (_label, key, value) => {
    await serverActions.setPreferenceCookie(key, value);

    expect(cookieSet).not.toHaveBeenCalled();
  });
});
