import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiRequest } = vi.hoisted(() => ({ mockApiRequest: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  apiRequest: mockApiRequest,
  apiRequestFromClient: vi.fn(),
}));

import { getAssignmentRequests, getTransferRequests } from "@/lib/api/requests";

// Shapes as `RequestsService` returns them (Prisma rows + includes).
const section = (id: number, club: string, type: string) => ({
  club_section_id: id,
  clubs: { name: club },
  club_types: { name: type },
});

const user = (id: string, name: string, last: string) => ({
  user_id: id,
  name,
  paternal_last_name: last,
});

describe("requests API contract", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("maps backend transfer rows to the admin shape", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [
        {
          transfer_request_id: "tr-1",
          user_id: "u-1",
          from_section_id: 10,
          to_section_id: 20,
          reason: "Cambio de ciudad",
          status: "pending",
          review_comment: null,
          reviewed_at: null,
          created_at: "2026-06-25T12:00:00.000Z",
          user: user("u-1", "Ana", "Ruiz"),
          from_section: section(10, "Club Águilas", "Conquistadores"),
          to_section: section(20, "Club Halcones", "Conquistadores"),
          reviewer: null,
        },
      ],
    });

    const [row] = await getTransferRequests({ section_id: 20 });

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/transfers", {
      params: { sectionId: 20 },
    });
    expect(row).toEqual(
      expect.objectContaining({
        request_id: "tr-1",
        status: "PENDING",
        reason: "Cambio de ciudad",
        requester: expect.objectContaining({
          user_id: "u-1",
          first_name: "Ana",
          last_name: "Ruiz",
        }),
        from_section: { section_id: 10, name: "Club Águilas · Conquistadores" },
        to_section: { section_id: 20, name: "Club Halcones · Conquistadores" },
      }),
    );
  });

  it("maps backend assignment rows to the admin shape", async () => {
    mockApiRequest.mockResolvedValue([
      {
        request_id: "ar-1",
        club_section_id: 20,
        status: "approved",
        comment: "Ok",
        created_at: "2026-06-25T12:00:00.000Z",
        reviewed_at: "2026-06-26T12:00:00.000Z",
        user: user("u-2", "Luis", "Paz"),
        role: { role_id: "r-1", role_name: "counselor" },
        requester: user("u-3", "Eva", "Sol"),
        approver: user("u-4", "Iván", "Mar"),
        club_section: section(20, "Club Halcones", "Conquistadores"),
      },
    ]);

    const [row] = await getAssignmentRequests();

    expect(row).toEqual(
      expect.objectContaining({
        request_id: "ar-1",
        status: "APPROVED",
        role_to_assign: "counselor",
        comment: "Ok",
        target_user: expect.objectContaining({ first_name: "Luis", last_name: "Paz" }),
        requested_by: expect.objectContaining({ first_name: "Eva", last_name: "Sol" }),
        section: { section_id: 20, name: "Club Halcones · Conquistadores" },
      }),
    );
  });
});
