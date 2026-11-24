import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import SupervisionRedirect from "./supervision/page";
import QuarterlyRedirect from "./quarterly/page";
import AnnualRedirect from "./annual/page";

async function landing(page: typeof SupervisionRedirect, query: Record<string, string | string[] | undefined>) {
  await expect(page({ searchParams: Promise.resolve(query) })).rejects.toThrow("NEXT_REDIRECT");
  return redirectMock.mock.calls.at(-1)?.[0];
}

describe("legacy report URLs", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT ${url}`);
    });
  });

  it("/reports/supervision lands on the monthly tab with its filters", async () => {
    expect(await landing(SupervisionRedirect, { year: "2025", local_field_id: "4" })).toBe(
      "/dashboard/reports?year=2025&local_field_id=4",
    );
  });

  it("/reports/quarterly lands on the quarterly tab with its filters", async () => {
    expect(await landing(QuarterlyRedirect, { club_id: "4", status: "draft" })).toBe(
      "/dashboard/reports?tab=quarterly&club_id=4&status=draft",
    );
  });

  it("/reports/annual lands on the annual tab", async () => {
    expect(await landing(AnnualRedirect, {})).toBe("/dashboard/reports?tab=annual");
  });
});
