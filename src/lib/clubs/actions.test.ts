import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdminUser = vi.fn();
const mockSucceedClubSectionDirector = vi.fn();
const mockUpdateClubSection = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => {
    return (key: string, values?: Record<string, unknown>) => {
      if (key === "validation.field_required") return `${values?.field} requerido`;
      if (key === "validation.field_invalid") return `${values?.field} inválido`;
      return key;
    };
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: () => mockRequireAdminUser(),
}));

vi.mock("@/lib/api/clubs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/clubs")>();
  return {
    ...actual,
    succeedClubSectionDirector: (...args: unknown[]) =>
      mockSucceedClubSectionDirector(...args),
    updateClubSection: (...args: unknown[]) => mockUpdateClubSection(...args),
  };
});

import {
  succeedClubSectionDirectorAction,
  updateClubSectionAction,
} from "@/lib/clubs/actions";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("succeedClubSectionDirectorAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["director-lf"],
    });
    mockSucceedClubSectionDirector.mockResolvedValue({
      ended_assignment_id: "old-assignment",
      new_assignment_id: "new-assignment",
    });
    mockUpdateClubSection.mockResolvedValue({
      club_section_id: 7,
      active: false,
    });
  });

  it("rejects admin users that are not director-lf or assistant-lf before calling the API", async () => {
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["admin"],
    });

    const result = await succeedClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        current_assignment_id: "old-assignment",
        successor_user_id: "successor-user",
        ecclesiastical_year_id: "2026",
      }),
    );

    expect(result.error).toMatch(/director-lf|assistant-lf/i);
    expect(mockSucceedClubSectionDirector).not.toHaveBeenCalled();
  });

  it("calls the director succession endpoint for director-lf users", async () => {
    const result = await succeedClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        current_assignment_id: "old-assignment",
        successor_user_id: "successor-user",
        ecclesiastical_year_id: "2026",
        start_date: "2026-10-01",
      }),
    );

    expect(result.success).toBeTruthy();
    expect(mockSucceedClubSectionDirector).toHaveBeenCalledWith(10, 7, {
      current_assignment_id: "old-assignment",
      successor_user_id: "successor-user",
      ecclesiastical_year_id: 2026,
      start_date: "2026-10-01",
    });
  });
});

describe("updateClubSectionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["admin"],
    });
    mockUpdateClubSection.mockResolvedValue({
      club_section_id: 7,
      active: false,
    });
  });

  it("sends section operational fields and active status to the API", async () => {
    const result = await updateClubSectionAction(
      10,
      7,
      {},
      makeFormData({
        name: "Conquistadores Central",
        souls_target: "12",
        fee: "150",
        meeting_day: "Saturday",
        meeting_time: "10:30",
        active: "false",
      }),
    );

    expect(result.success).toBeTruthy();
    expect(mockUpdateClubSection).toHaveBeenCalledWith(10, 7, {
      name: "Conquistadores Central",
      active: false,
      souls_target: 12,
      fee: 150,
      meeting_day: [{ day: "Saturday" }],
      meeting_time: [{ time: "10:30" }],
    });
  });
});
