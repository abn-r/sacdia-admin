import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: vi.fn(),
}));

import {
  getPipelineEnrollments,
  getPipelineHistory,
} from "@/lib/api/investiture";

describe("investiture pipeline API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps the canonical pending envelope and filters with status", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [{ enrollment_id: 7, investiture_status: "SUBMITTED_FOR_VALIDATION" }],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });

    await expect(getPipelineEnrollments("SUBMITTED_FOR_VALIDATION")).resolves.toEqual([
      { enrollment_id: 7, investiture_status: "SUBMITTED_FOR_VALIDATION" },
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/investiture/pending", {
      params: { status: "SUBMITTED_FOR_VALIDATION" },
    });
  });

  it.each(["INVESTIDO", "REJECTED"] as const)(
    "applies the %s terminal tab filter",
    async (status) => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: {
          data: [{ enrollment_id: 8, investiture_status: status }],
          meta: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      await expect(getPipelineEnrollments(status)).resolves.toEqual([
        { enrollment_id: 8, investiture_status: status },
      ]);
      expect(mockApiRequest).toHaveBeenCalledWith("/investiture/pending", {
        params: { status },
      });
    },
  );

  it("uses the backend default pending filter when no tab status is supplied", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });

    await expect(getPipelineEnrollments()).resolves.toEqual([]);
    expect(mockApiRequest).toHaveBeenCalledWith("/investiture/pending", {
      params: {},
    });
  });

  it("uses the canonical history path and preserves performer names and comments", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        enrollment_id: 7,
        history: [{
          history_id: 3,
          enrollment_id: 7,
          action: "CLUB_APPROVED",
          performed_by: { name: "Ana", paternal_last_name: "López" },
          comments: "Revisado en comité",
          created_at: "2026-08-03T12:00:00.000Z",
        }],
      },
    });

    await expect(getPipelineHistory(7)).resolves.toEqual([{
      history_id: 3,
      enrollment_id: 7,
      action: "CLUB_APPROVED",
      performed_by: { name: "Ana", paternal_last_name: "López" },
      comments: "Revisado en comité",
      created_at: "2026-08-03T12:00:00.000Z",
    }]);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/investiture/enrollments/7/history",
    );
  });
});
