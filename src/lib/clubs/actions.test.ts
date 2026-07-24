import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdminUser = vi.fn();
const mockSucceedClubSectionDirector = vi.fn();

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
  };
});

import { succeedClubSectionDirectorAction } from "@/lib/clubs/actions";

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
