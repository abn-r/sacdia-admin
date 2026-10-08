import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { apiRequest } from "@/lib/api/client";
import { getActiveEcclesiasticalYearId } from "@/lib/api/catalogs";

const mockApiRequest = vi.mocked(apiRequest);

const YEAR_2025 = {
  ecclesiastical_year_id: 7,
  name: "2025-2026",
  start_date: "2025-10-01",
  end_date: "2026-09-30",
  active: true,
};

describe("getActiveEcclesiasticalYearId", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("resolves the year from the /current endpoint without listing", async () => {
    mockApiRequest.mockResolvedValueOnce(YEAR_2025);

    await expect(getActiveEcclesiasticalYearId()).resolves.toBe(7);

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/catalogs/ecclesiastical-years/current",
    );
  });

  it("falls back to the latest year by start_date when /current returns nothing", async () => {
    mockApiRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([
        { ...YEAR_2025, ecclesiastical_year_id: 1, start_date: "2023-10-01" },
        { ...YEAR_2025, ecclesiastical_year_id: 9, start_date: "2026-10-01" },
        { ...YEAR_2025, ecclesiastical_year_id: 4, start_date: "2024-10-01" },
      ]);

    await expect(getActiveEcclesiasticalYearId()).resolves.toBe(9);

    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/catalogs/ecclesiastical-years",
    );
  });

  it("falls back when /current fails", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([YEAR_2025]);

    await expect(getActiveEcclesiasticalYearId()).resolves.toBe(7);
  });

  it("never sends the unsupported ?active=true query", async () => {
    mockApiRequest.mockResolvedValueOnce(null).mockResolvedValueOnce([]);

    await getActiveEcclesiasticalYearId();

    for (const [path] of mockApiRequest.mock.calls) {
      expect(String(path)).not.toContain("active=");
    }
  });

  it("returns null when /current is empty and the catalog is empty", async () => {
    mockApiRequest.mockResolvedValueOnce(null).mockResolvedValueOnce([]);

    await expect(getActiveEcclesiasticalYearId()).resolves.toBeNull();
  });

  it("returns null when everything fails", async () => {
    mockApiRequest.mockRejectedValue(new Error("down"));

    await expect(getActiveEcclesiasticalYearId()).resolves.toBeNull();
  });
});
