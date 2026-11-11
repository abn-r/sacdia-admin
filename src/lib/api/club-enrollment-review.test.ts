import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { ApiError, apiRequest } from "@/lib/api/client";
import {
  approveClubEnrollment,
  getClubEnrollmentErrorCode,
  listClubEnrollmentQueue,
  rejectClubEnrollment,
} from "@/lib/api/club-enrollment-review";

const mockApiRequest = vi.mocked(apiRequest);

describe("club-enrollment-review API client", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("lists with every filter in snake_case, trimmed search and paging, and unwraps the envelope", async () => {
    const page = { items: [], meta: { page: 2, limit: 20, total: 0, counts: { pending: 0, approved: 0, rejected: 0 } } };
    mockApiRequest.mockResolvedValue({ status: "success", data: page });

    const result = await listClubEnrollmentQueue({
      status: "active",
      search: "  águilas ",
      ecclesiasticalYearId: 7,
      localFieldId: 3,
      clubTypeId: 2,
      page: 2,
      limit: 20,
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/club-enrollments/validation/queue", {
      params: {
        status: "active",
        search: "águilas",
        ecclesiastical_year_id: 7,
        local_field_id: 3,
        club_type_id: 2,
        page: 2,
        limit: 20,
      },
    });
    expect(result).toEqual(page);
  });

  it("omits empty search and unset or null filters", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: {} });
    await listClubEnrollmentQueue({ search: "   ", ecclesiasticalYearId: null, localFieldId: null, clubTypeId: null });
    expect(mockApiRequest).toHaveBeenCalledWith("/club-enrollments/validation/queue", { params: {} });
  });

  it("approves with POST and no body", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { enrollment_id: "e1", status: "active" } });
    const result = await approveClubEnrollment("e1");
    expect(mockApiRequest).toHaveBeenCalledWith("/club-enrollments/e1/approve", { method: "POST" });
    expect(result).toMatchObject({ status: "active" });
  });

  it("rejects with the trimmed reason", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { enrollment_id: "e1", status: "rejected" } });
    await rejectClubEnrollment("e1", "  Falta dirección  ");
    expect(mockApiRequest).toHaveBeenCalledWith("/club-enrollments/e1/reject", {
      method: "POST",
      body: { reason: "Falta dirección" },
    });
  });

  it("reads the backend error code from the flat, error and errors shapes", () => {
    expect(getClubEnrollmentErrorCode(new ApiError("x", 403, { code: "CE_SELF_REVIEW" }))).toBe("CE_SELF_REVIEW");
    expect(getClubEnrollmentErrorCode(new ApiError("x", 409, { error: { code: "CE_ENROLLMENT_NOT_PENDING" } }))).toBe(
      "CE_ENROLLMENT_NOT_PENDING",
    );
    expect(getClubEnrollmentErrorCode(new ApiError("x", 404, { errors: { code: "CE_ENROLLMENT_NOT_FOUND" } }))).toBe(
      "CE_ENROLLMENT_NOT_FOUND",
    );
    expect(getClubEnrollmentErrorCode(new ApiError("x", 500, null))).toBeNull();
    expect(getClubEnrollmentErrorCode(new Error("boom"))).toBeNull();
  });
});
