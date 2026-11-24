import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

import LegacySettingsRedirect from "./page";

describe("legacy /dashboard/investiture-settings", () => {
  it("redirects to the unified settings keeping the field and year", async () => {
    await expect(
      LegacySettingsRedirect({ searchParams: Promise.resolve({ local_field_id: "4", year: "7", x: "1" }) }),
    ).rejects.toThrow("REDIRECT:/dashboard/configuration/investiture?local_field_id=4&year=7");
  });

  it("redirects without a query when there is none", async () => {
    await expect(LegacySettingsRedirect({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/dashboard/configuration/investiture",
    );
  });
});
