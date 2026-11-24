import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest }));

import {
  listCertificationEnrollments,
  normalizeCertificationEnrollmentsPage,
} from "@/lib/api/certifications";

const envelope = {
  status: "success",
  data: {
    items: [
      {
        enrollment_id: 9,
        user_id: "u-1",
        name: "Valeria",
        paternal_last_name: "Ortiz",
        maternal_last_name: null,
        club_name: "Club Orión",
        section_name: "Guías Mayores",
        status: "IN_PROGRESS",
        progress_percent: 71,
        enrollment_date: "2026-02-03T00:00:00.000Z",
      },
      { user_id: "", name: "sin usuario" },
    ],
    total: 23,
    page: 2,
    limit: 20,
  },
};

describe("normalizeCertificationEnrollmentsPage", () => {
  it("reads the B2 envelope and drops rows without a user", () => {
    const page = normalizeCertificationEnrollmentsPage(envelope);
    expect(page).toMatchObject({ total: 23, page: 2, limit: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      enrollment_id: 9,
      name: "Valeria",
      maternal_last_name: null,
      status: "IN_PROGRESS",
      progress_percent: 71,
    });
  });

  it("clamps progress and uses the fallback page for a bare payload", () => {
    const page = normalizeCertificationEnrollmentsPage(
      { items: [{ user_id: "u", name: "A", progress_percent: 140 }] },
      { page: 4, limit: 10 },
    );
    expect(page.items[0]?.progress_percent).toBe(100);
    expect(page).toMatchObject({ page: 4, limit: 10, total: 1 });
  });
});

describe("listCertificationEnrollments", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("sends page, limit and only the filters that have a value", async () => {
    apiRequest.mockResolvedValue(envelope);
    await listCertificationEnrollments(7, { page: 2, search: " Val ", status: "" });
    expect(apiRequest).toHaveBeenCalledWith("/certifications/certifications/7/enrollments", {
      params: { page: 2, limit: 20, search: "Val" },
    });
  });

  it("lets a 404 propagate (it must not become an empty list)", async () => {
    apiRequest.mockRejectedValue(new Error("Not Found"));
    await expect(listCertificationEnrollments(7)).rejects.toThrow("Not Found");
  });
});
