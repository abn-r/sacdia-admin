import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

import { listNormalizedClubSectionMembers } from "@/lib/api/clubs";

describe("listNormalizedClubSectionMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes backend assignment rows with nested users and roles", async () => {
    mockApiRequest.mockResolvedValue([
      {
        assignment_id: "assignment-director",
        user_id: "user-director",
        club_section_id: 7,
        users: {
          name: "Ana",
          paternal_last_name: "García",
          maternal_last_name: "López",
          user_image: "avatar.jpg",
        },
        roles: {
          role_id: "role-director",
          role_name: "director",
        },
        current_class: {
          class_id: 6,
          name: "Guía",
          enrollment_id: 55,
          ecclesiastical_year_id: 2026,
        },
        active: true,
      },
    ]);

    await expect(listNormalizedClubSectionMembers(10, 7)).resolves.toEqual([
      expect.objectContaining({
        assignment_id: "assignment-director",
        user_id: "user-director",
        club_section_id: 7,
        name: "Ana García López",
        picture_url: "avatar.jpg",
        role: "director",
        role_id: "role-director",
        current_class_name: "Guía",
        current_class_id: 6,
        enrollment_id: 55,
      }),
    ]);
  });
});
