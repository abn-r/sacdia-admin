import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockApiRequestFromClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: (...args: unknown[]) =>
    mockApiRequestFromClient(...args),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

import {
  approveEnrollment,
  listEnrollments,
  rejectEnrollment,
} from "@/lib/api/enrollments";

describe("annual club enrollments admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists annual club enrollments pending Campo Local validation", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [
          {
            club_enrollment_id: "enrollment-1",
            status: "pending_validation",
            created_at: "2026-06-26T20:00:00.000Z",
            club_section: {
              club_section_id: 20,
              name: null,
              clubs: {
                club_id: 7,
                name: "ACV",
                local_fields: { local_field_id: 3, name: "Campo Centro" },
              },
              club_types: { club_type_id: 1, name: "Aventureros" },
            },
            ecclesiastical_year: {
              year_id: 9,
              start_date: "2025-07-01",
              end_date: "2026-06-30",
            },
            creator: {
              user_id: "director-1",
              name: "Abner",
              paternal_last_name: "López",
              email: "abner@example.com",
            },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    await expect(listEnrollments({ page: 1, limit: 20 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          club_enrollment_id: "enrollment-1",
          status: "pending_validation",
          club: expect.objectContaining({ name: "ACV" }),
          section: expect.objectContaining({ name: "Aventureros" }),
          local_field: expect.objectContaining({ name: "Campo Centro" }),
          created_by: expect.objectContaining({ name: "Abner López" }),
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      endpointAvailable: true,
      endpointState: "available",
      endpointDetail: "Disponible (1 inscripciones anuales pendientes).",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/club-enrollments/validation/queue",
      { params: { page: 1, limit: 20 } },
    );
  });

  it("approves and rejects annual club enrollments through validation endpoints", async () => {
    mockApiRequestFromClient.mockResolvedValue({ status: "success", data: {} });

    await approveEnrollment("enrollment-1");
    await rejectEnrollment("enrollment-2");

    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(
      1,
      "/club-enrollments/enrollment-1/approve",
      { method: "POST" },
    );
    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(
      2,
      "/club-enrollments/enrollment-2/reject",
      { method: "POST" },
    );
  });
});
