import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));
vi.mock("@/i18n/request", () => ({
  LOCALES: ["es", "pt-BR", "en", "fr"],
  LOCALE_COOKIE: "sacdia_admin_locale",
}));

import { setLocaleAction } from "./locale-actions";

describe("setLocaleAction", () => {
  beforeEach(() => set.mockClear());

  it("stores a supported locale for a year", async () => {
    await expect(setLocaleAction("fr")).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith(
      "sacdia_admin_locale",
      "fr",
      expect.objectContaining({ path: "/", maxAge: 31_536_000, httpOnly: false }),
    );
  });

  it("ignores unsupported locales", async () => {
    await expect(setLocaleAction("de")).resolves.toBe(false);
    expect(set).not.toHaveBeenCalled();
  });
});
