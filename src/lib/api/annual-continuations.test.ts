import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    apiRequestFromClient: vi.fn(),
  };
});

import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import {
  listAnnualContinuations,
  submitAnnualContinuationsFromClient,
  unwrapContinuationItems,
} from "./annual-continuations";

const mockApiRequest = vi.mocked(apiRequest);
const mockApiRequestFromClient = vi.mocked(apiRequestFromClient);

const ITEM = {
  user_id: "user-av-graduate-uuid",
  name: "Eva Ávila Cruz",
  base_section_id: 101,
  ecclesiastical_year_id: 2026,
  annual_status: "not_enrolled" as const,
  current_role: null,
  eligibility: "eligible" as const,
  blocked_reason: null,
  suggested_class: { status: "resolved" as const, class_id: 201 },
};

describe("annual-continuations API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequestFromClient.mockReset();
  });

  it("unwraps nested paginated envelope", () => {
    expect(
      unwrapContinuationItems({
        status: "success",
        data: { data: [ITEM], meta: { total: 1 } },
      }),
    ).toEqual([ITEM]);
  });

  it("lists continuations on the dest section path", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { data: [ITEM], meta: { total: 1 } },
    });

    const rows = await listAnnualContinuations(101, { limit: 100 });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/club-sections/101/annual-continuations",
      { params: { limit: 100 } },
    );
    expect(rows).toEqual([ITEM]);
  });

  it("posts user_ids and never calls annual-enroll", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        results: [
          {
            user_id: ITEM.user_id,
            outcome: "enrolled",
            club_section_id: 101,
            ecclesiastical_year_id: 2026,
            enrollment_id: 99,
            error_code: null,
          },
        ],
      },
    });

    const results = await submitAnnualContinuationsFromClient(101, [ITEM.user_id]);

    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/club-sections/101/annual-continuations",
      {
        method: "POST",
        body: { user_ids: [ITEM.user_id] },
      },
    );
    expect(JSON.stringify(mockApiRequestFromClient.mock.calls)).not.toContain(
      "annual-enroll",
    );
    expect(results[0]?.outcome).toBe("enrolled");
  });
});
