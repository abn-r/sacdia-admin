import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

import LegacyPastorsRedirect from "./page";

describe("legacy /dashboard/investiture-pastors", () => {
  it("redirects to the unified settings keeping the field", async () => {
    await expect(
      LegacyPastorsRedirect({ searchParams: Promise.resolve({ local_field_id: "4" }) }),
    ).rejects.toThrow("REDIRECT:/dashboard/configuration/investiture?local_field_id=4");
  });

  it("redirects without a query when there is none", async () => {
    await expect(LegacyPastorsRedirect({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/dashboard/configuration/investiture",
    );
  });
});
