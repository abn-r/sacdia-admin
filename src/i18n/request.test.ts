import { beforeEach, describe, expect, it, vi } from "vitest";

const selectedLocale = vi.hoisted(() => ({ value: "es" }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "sacdia_admin_locale" ? { value: selectedLocale.value } : undefined,
  })),
}));

vi.mock("next-intl/server", () => ({
  getRequestConfig: vi.fn((config: unknown) => config),
}));

import esMessages from "../../messages/es.json";
import requestConfig from "./request";

beforeEach(() => {
  selectedLocale.value = "es";
});

describe("i18n request config", () => {
  it("falls back to Spanish for missing locale keys", async () => {
    selectedLocale.value = "fr";

    const result = await requestConfig({ requestLocale: Promise.resolve("fr") });

    expect(result.locale).toBe("fr");
    expect(result.messages!.dashboardHub!.roleChart!.noRoleChip).toBe(
      esMessages.dashboardHub.roleChart.noRoleChip,
    );
    expect(result.messages!.users!.pages!.new!.title).toBe(
      esMessages.users.pages.new.title,
    );
  });

  it("keeps the Spanish catalog unchanged for the base locale", async () => {
    selectedLocale.value = "es";

    const result = await requestConfig({ requestLocale: Promise.resolve("es") });

    expect(result.locale).toBe("es");
    expect(result.messages).toEqual(esMessages);
  });
});
