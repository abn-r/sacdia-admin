import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

import { expireOverdueClassEnrollments } from "@/lib/api/classes";
import { createAdminClass } from "@/lib/api/phase-e-catalogs";

describe("classes admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends duration and availability fields when creating an admin class", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { class_id: 1 } });

    await createAdminClass({
      name: "Guía Mayor",
      description: "Clase legacy",
      active: true,
      available_from_year_id: 10,
      available_until_year_id: null,
      min_duration_years: 2,
      max_duration_years: 3,
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes", {
      method: "POST",
      body: {
        name: "Guía Mayor",
        description: "Clase legacy",
        active: true,
        available_from_year_id: 10,
        available_until_year_id: null,
        min_duration_years: 2,
        max_duration_years: 3,
      },
    });
  });

  it("posts manual expiration requests to the admin endpoint", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        ecclesiastical_year_id: 10,
        dry_run: true,
        scanned_count: 4,
        expired_count: 2,
        enrollment_ids: [1, 2],
      },
    });

    await expireOverdueClassEnrollments({ ecclesiastical_year_id: 10, dry_run: true });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/admin/classes/enrollments/expire-overdue",
      {
        method: "POST",
        body: { ecclesiastical_year_id: 10, dry_run: true },
      },
    );
  });
});
