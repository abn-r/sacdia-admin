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
    mockApiRequest.mockReset();
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

  it("collects every pending page while preserving the selected status filter", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        status: "success",
        data: {
          data: Array.from({ length: 20 }, (_, index) => ({
            enrollment_id: index + 1,
            investiture_status: "FIELD_APPROVED" as const,
          })),
          meta: {
            page: 1,
            limit: 20,
            total: 40,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
      })
      .mockResolvedValueOnce({
        status: "success",
        data: {
          data: Array.from({ length: 20 }, (_, index) => ({
            enrollment_id: index + 21,
            investiture_status: "FIELD_APPROVED" as const,
          })),
          meta: {
            page: 2,
            limit: 20,
            total: 40,
            totalPages: 2,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        },
      });

    const enrollments = await getPipelineEnrollments("FIELD_APPROVED");

    expect(enrollments).toHaveLength(40);
    expect(enrollments[0]).toEqual({
      enrollment_id: 1,
      investiture_status: "FIELD_APPROVED",
    });
    expect(enrollments.at(-1)).toEqual({
      enrollment_id: 40,
      investiture_status: "FIELD_APPROVED",
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/investiture/pending", {
      params: { status: "FIELD_APPROVED" },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/investiture/pending", {
      params: { status: "FIELD_APPROVED", page: 2 },
    });
  });

  it("continues until the contract totalPages bound is reached", async () => {
    mockApiRequest.mockImplementation(
      (_path: string, options: { params: { page?: number } }) => {
        const page = options.params.page ?? 1;
        const rowsOnPage = page === 1_001 ? 1 : 20;

        return Promise.resolve({
          status: "success",
          data: {
            data: Array.from({ length: rowsOnPage }, (_, index) => ({
              enrollment_id: ((page - 1) * 20) + index + 1,
              investiture_status: "FIELD_APPROVED" as const,
            })),
            meta: {
              page,
              limit: 20,
              total: 20_001,
              totalPages: 1_001,
              hasNextPage: page < 1_001,
              hasPreviousPage: page > 1,
            },
          },
        });
      },
    );

    await expect(getPipelineEnrollments("FIELD_APPROVED")).resolves.toHaveLength(20_001);
  });

  it("fails closed when a non-final page is shorter than its contract limit", async () => {
    mockApiRequest.mockResolvedValueOnce({
      status: "success",
      data: {
        data: [{ enrollment_id: 1, investiture_status: "FIELD_APPROVED" }],
        meta: {
          page: 1,
          limit: 20,
          total: 40,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    });

    await expect(getPipelineEnrollments("FIELD_APPROVED")).rejects.toThrow(
      "Investiture pipeline pagination returned a short non-final page",
    );
  });

  it("fails closed when a page repeats an enrollment", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [
          { enrollment_id: 1, investiture_status: "FIELD_APPROVED" },
          { enrollment_id: 1, investiture_status: "FIELD_APPROVED" },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });

    await expect(getPipelineEnrollments("FIELD_APPROVED")).rejects.toThrow(
      "Investiture pipeline pagination returned a duplicated enrollment",
    );
  });

  it("fails closed when a continuation repeats a fetched page", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        status: "success",
        data: {
          data: Array.from({ length: 20 }, (_, index) => ({
            enrollment_id: index + 1,
            investiture_status: "FIELD_APPROVED" as const,
          })),
          meta: {
            page: 1,
            limit: 20,
            total: 40,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
      })
      .mockResolvedValueOnce({
        status: "success",
        data: {
          data: [{ enrollment_id: 13, investiture_status: "FIELD_APPROVED" }],
          meta: {
            page: 1,
            limit: 20,
            total: 40,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
      });

    await expect(getPipelineEnrollments("FIELD_APPROVED")).rejects.toThrow(
      "Investiture pipeline pagination returned a repeated page",
    );
  });

  it("fails closed when totals understate the number of pages", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [{ enrollment_id: 14, investiture_status: "FIELD_APPROVED" }],
        meta: {
          page: 1,
          limit: 20,
          total: 21,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });

    await expect(getPipelineEnrollments("FIELD_APPROVED")).rejects.toThrow(
      "Investiture pipeline pagination returned inconsistent metadata",
    );
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
