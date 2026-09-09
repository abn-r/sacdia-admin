import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdminUser = vi.fn();
const mockSucceedClubSectionDirector = vi.fn();
const mockDesignateClubSectionDirector = vi.fn();
const mockReplaceClubSectionDirectorDesignation = vi.fn();

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
    designateClubSectionDirector: (...args: unknown[]) =>
      mockDesignateClubSectionDirector(...args),
    replaceClubSectionDirectorDesignation: (...args: unknown[]) =>
      mockReplaceClubSectionDirectorDesignation(...args),
  };
});

import {
  succeedClubSectionDirectorAction,
  designateClubSectionDirectorAction,
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

describe("designateClubSectionDirectorAction", () => {
  const ALLOWED_ROLES = ["super-admin", "admin", "director-lf", "assistant-lf"];

  function setupUser(roles: string[]) {
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupUser(["director-lf"]);
    mockDesignateClubSectionDirector.mockResolvedValue({
      succession_id: "succ-new",
      user_id: "00000000-0000-0000-0000-000000000002",
      ecclesiastical_year_id: 2027,
      status: "scheduled",
      version: 1,
      outgoing_assignment_id: null,
    });
    mockReplaceClubSectionDirectorDesignation.mockResolvedValue({
      succession_id: "succ-new",
      user_id: "00000000-0000-0000-0000-000000000002",
      ecclesiastical_year_id: 2027,
      status: "scheduled",
      version: 2,
      outgoing_assignment_id: null,
    });
  });

  it.each(ALLOWED_ROLES)("allows %s to designate", async (role) => {
    setupUser([role]);
    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "00000000-0000-0000-0000-000000000002",
        ecclesiastical_year_id: "2027",
      }),
    );

    expect(result.error).toBeUndefined();
    expect(result.success).toBeTruthy();
    expect(mockDesignateClubSectionDirector).toHaveBeenCalledWith(
      10,
      7,
      {
        user_id: "00000000-0000-0000-0000-000000000002",
        ecclesiastical_year_id: 2027,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
        }),
      }),
    );
  });

  it("rejects members without allowed roles", async () => {
    setupUser(["member"]);

    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "00000000-0000-0000-0000-000000000002",
        ecclesiastical_year_id: "2027",
      }),
    );

    expect(result.error).toBeTruthy();
    expect(mockDesignateClubSectionDirector).not.toHaveBeenCalled();
  });

  it("returns error when user_id is missing", async () => {
    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({ ecclesiastical_year_id: "2027" }),
    );

    expect(result.error).toBeTruthy();
    expect(mockDesignateClubSectionDirector).not.toHaveBeenCalled();
  });

  it("returns error when ecclesiastical_year_id is missing", async () => {
    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({ user_id: "00000000-0000-0000-0000-000000000002" }),
    );

    expect(result.error).toBeTruthy();
    expect(mockDesignateClubSectionDirector).not.toHaveBeenCalled();
  });

  it("calls replaceClubSectionDirectorDesignation when replace=true", async () => {
    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "00000000-0000-0000-0000-000000000002",
        ecclesiastical_year_id: "2027",
        replace: "true",
        succession_id: "succ-1",
        version: "1",
      }),
    );

    expect(result.success).toBeTruthy();
    expect(mockReplaceClubSectionDirectorDesignation).toHaveBeenCalledWith(10, 7, {
      succession_id: "succ-1",
      version: 1,
      successor_user_id: "00000000-0000-0000-0000-000000000002",
    });
    expect(mockDesignateClubSectionDirector).not.toHaveBeenCalled();
  });

  it("rejects replace without succession_id and version", async () => {
    const result = await designateClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "00000000-0000-0000-0000-000000000002",
        ecclesiastical_year_id: "2027",
        replace: "true",
      }),
    );

    expect(result.error).toBeTruthy();
    expect(mockReplaceClubSectionDirectorDesignation).not.toHaveBeenCalled();
    expect(mockDesignateClubSectionDirector).not.toHaveBeenCalled();
  });
});
