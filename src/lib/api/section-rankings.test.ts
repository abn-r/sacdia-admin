import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { apiRequest } from "@/lib/api/client";
import { getSectionMembers, listSectionRankings } from "./section-rankings";

const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => mockApiRequest.mockReset());

describe("getSectionMembers", () => {
  it("reads the rows the backend sends (enrollment_id, member_name, section_name)", async () => {
    mockApiRequest.mockResolvedValue({
      data: [
        {
          enrollment_id: 41,
          user_id: "u-1",
          member_name: "Ana Pérez",
          club_section_id: 5,
          section_name: "Guías Mayores",
          class_score_pct: 80,
          investiture_score_pct: 100,
          camporee_score_pct: null,
          composite_score_pct: 90,
          rank_position: 1,
          awarded_category: { id: "c-1", name: "Oro" },
          composite_calculated_at: null,
        },
      ],
    });

    const members = await getSectionMembers(5, 3);

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      enrollment_id: 41,
      member_ranking_id: 41,
      ecclesiastical_year_id: 3,
      user: { name: "Ana Pérez" },
      section: { section_id: 5, name: "Guías Mayores" },
      awarded_category: { name: "Oro" },
    });
  });
});

describe("listSectionRankings", () => {
  it("keeps the club name when the backend sends it", async () => {
    mockApiRequest.mockResolvedValue({
      data: [
        { club_section_id: 5, section_name: "Guías Mayores", club_name: "Club Orión", active_enrollment_count: 2 },
        { club_section_id: 6, section_name: "Conquistadores", active_enrollment_count: 1 },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    const result = await listSectionRankings({ year_id: 3 });

    expect(result.items[0]?.club_name).toBe("Club Orión");
    expect(result.items[1]?.club_name).toBeNull();
  });
});
