import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: (...args: unknown[]) => mockApiRequest(...args) };
});

import { getMyCoordinatorScope } from "@/lib/api/coordination";

describe("getMyCoordinatorScope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads GET /coordination/me/scope and unwraps the envelope", async () => {
    const scope = {
      is_coordinator: true,
      club_section_ids: [7],
      assignments: [],
      sections: [
        {
          club_section_id: 7,
          name: "Conquistadores",
          club_type_id: 2,
          club_type_name: "Conquistadores",
          club_id: 3,
          club_name: "Club Águilas",
          district_id: 1,
          district_name: "Distrito Norte",
          local_field_id: 5,
          local_field_name: "Campo Sur",
        },
      ],
    };
    mockApiRequest.mockResolvedValue({ status: "success", data: scope });

    await expect(getMyCoordinatorScope()).resolves.toEqual(scope);
    expect(mockApiRequest).toHaveBeenCalledWith("/coordination/me/scope");
  });
});
