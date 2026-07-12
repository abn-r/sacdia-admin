import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

import {
  createClassCounselorAssignment,
  listClassCounselorAssignments,
  listNormalizedClubSectionMembers,
  revokeClassCounselorAssignment,
  updateClassCounselorAssignment,
} from "@/lib/api/clubs";

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

describe("class counselor assignment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists class counselor assignments scoped by club section", async () => {
    mockApiRequest.mockResolvedValue([]);

    await listClassCounselorAssignments(10, 7, {
      yearId: 2026,
      classId: 3,
      active: true,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/clubs/10/sections/7/class-counselor-assignments",
      {
        params: {
          yearId: 2026,
          classId: 3,
          active: true,
        },
      },
    );
  });

  it("creates, updates and revokes class counselor assignments", async () => {
    mockApiRequest.mockResolvedValue({ assignment_id: "assignment-1" });

    await createClassCounselorAssignment(10, 7, {
      user_id: "user-1",
      class_id: 3,
      ecclesiastical_year_id: 2026,
      responsibility_type: "primary",
    });
    await updateClassCounselorAssignment("assignment-1", {
      responsibility_type: "assistant",
      exceptional: true,
      exception_reason: "Apoyo temporal",
    });
    await revokeClassCounselorAssignment("assignment-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/clubs/10/sections/7/class-counselor-assignments",
      {
        method: "POST",
        body: {
          user_id: "user-1",
          class_id: 3,
          ecclesiastical_year_id: 2026,
          responsibility_type: "primary",
        },
      },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/class-counselor-assignments/assignment-1",
      {
        method: "PATCH",
        body: {
          responsibility_type: "assistant",
          exceptional: true,
          exception_reason: "Apoyo temporal",
        },
      },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/class-counselor-assignments/assignment-1",
      {
        method: "DELETE",
      },
    );
  });
});
