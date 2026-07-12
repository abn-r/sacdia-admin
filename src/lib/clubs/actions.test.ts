import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdminUser = vi.fn();
const mockCreateClub = vi.fn();
const mockCreateClubSection = vi.fn();
const mockCreateClassCounselorAssignment = vi.fn();
const mockAssignInitialClubSectionDirector = vi.fn();
const mockSucceedClubSectionDirector = vi.fn();
const mockUpdateClubSection = vi.fn();
const mockUpdateClassCounselorAssignment = vi.fn();
const mockRevokeClassCounselorAssignment = vi.fn();

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
    createClub: (...args: unknown[]) => mockCreateClub(...args),
    createClubSection: (...args: unknown[]) => mockCreateClubSection(...args),
    createClassCounselorAssignment: (...args: unknown[]) =>
      mockCreateClassCounselorAssignment(...args),
    assignInitialClubSectionDirector: (...args: unknown[]) =>
      mockAssignInitialClubSectionDirector(...args),
    updateClassCounselorAssignment: (...args: unknown[]) =>
      mockUpdateClassCounselorAssignment(...args),
    revokeClassCounselorAssignment: (...args: unknown[]) =>
      mockRevokeClassCounselorAssignment(...args),
    succeedClubSectionDirector: (...args: unknown[]) =>
      mockSucceedClubSectionDirector(...args),
    updateClubSection: (...args: unknown[]) => mockUpdateClubSection(...args),
  };
});

import {
  createClubWithSectionsAction,
  createClassCounselorAssignmentAction,
  assignInitialClubSectionDirectorAction,
  revokeClassCounselorAssignmentAction,
  succeedClubSectionDirectorAction,
  updateClassCounselorAssignmentAction,
  updateClubSectionAction,
} from "@/lib/clubs/actions";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createClubWithSectionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["director-lf"],
      authorization: {
        effective: {
          scope: {
            global: {
              local_field: { id: 10, name: "Campo Local" },
            },
          },
        },
      },
    });
    mockCreateClub.mockResolvedValue({ club_id: 55 });
    mockCreateClubSection.mockResolvedValue({ club_section_id: 77 });
  });

  it("sends the backend district field when creating a club", async () => {
    await createClubWithSectionsAction(
      {},
      makeFormData({
        name: "Club Central",
        description: "Club de prueba",
        local_field_id: "10",
        district_id: "20",
        church_id: "30",
        address: "Calle 123",
        section_club_type_id_0: "2",
        section_name_0: "Conquistadores",
      }),
    );

    expect(mockCreateClub).toHaveBeenCalledWith({
      name: "Club Central",
      description: "Club de prueba",
      local_field_id: 10,
      districlub_type_id: 20,
      church_id: 30,
      address: "Calle 123",
      coordinates: undefined,
    });
    expect(mockCreateClub.mock.calls[0]?.[0]).not.toHaveProperty("district_id");
  });
});

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

  it("allows admin users to call the director succession endpoint", async () => {
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

    expect(result.success).toBeTruthy();
    expect(mockSucceedClubSectionDirector).toHaveBeenCalledWith(10, 7, {
      current_assignment_id: "old-assignment",
      successor_user_id: "successor-user",
      ecclesiastical_year_id: 2026,
    });
  });

  it("allows super-admin users to call the director succession endpoint", async () => {
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["super-admin"],
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

    expect(result.success).toBeTruthy();
    expect(mockSucceedClubSectionDirector).toHaveBeenCalled();
  });

  it("rejects unrelated admin-panel roles before calling the API", async () => {
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["coordinator"],
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

    expect(result.error).toMatch(/admin|super-admin|director-lf|assistant-lf/i);
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

describe("assignInitialClubSectionDirectorAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["admin"],
    });
    mockAssignInitialClubSectionDirector.mockResolvedValue({
      assignment_id: "director-assignment",
    });
  });

  it("allows admin users to assign the initial section director", async () => {
    const result = await assignInitialClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "director-user",
        ecclesiastical_year_id: "2026",
        start_date: "2026-01-15",
      }),
    );

    expect(result.success).toBeTruthy();
    expect(mockAssignInitialClubSectionDirector).toHaveBeenCalledWith(10, 7, {
      user_id: "director-user",
      ecclesiastical_year_id: 2026,
      start_date: "2026-01-15",
    });
  });

  it("rejects unrelated roles before assigning the initial director", async () => {
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["coordinator"],
    });

    const result = await assignInitialClubSectionDirectorAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "director-user",
        ecclesiastical_year_id: "2026",
      }),
    );

    expect(result.error).toMatch(/admin|super-admin|director-lf|assistant-lf/i);
    expect(mockAssignInitialClubSectionDirector).not.toHaveBeenCalled();
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

describe("class counselor assignment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({
      id: "actor-1",
      email: "actor@example.com",
      roles: ["director"],
    });
    mockCreateClassCounselorAssignment.mockResolvedValue({
      assignment_id: "assignment-1",
    });
    mockUpdateClassCounselorAssignment.mockResolvedValue({
      assignment_id: "assignment-1",
    });
    mockRevokeClassCounselorAssignment.mockResolvedValue({
      assignment_id: "assignment-1",
    });
  });

  it("creates a class counselor assignment from form data", async () => {
    const result = await createClassCounselorAssignmentAction(
      10,
      7,
      {},
      makeFormData({
        user_id: "user-1",
        class_id: "3",
        ecclesiastical_year_id: "2026",
        responsibility_type: "primary",
        exceptional: "true",
        exception_reason: "Apoyo temporal",
      }),
    );

    expect(result.success).toBeTruthy();
    expect(mockCreateClassCounselorAssignment).toHaveBeenCalledWith(10, 7, {
      user_id: "user-1",
      class_id: 3,
      ecclesiastical_year_id: 2026,
      responsibility_type: "primary",
      exceptional: true,
      exception_reason: "Apoyo temporal",
    });
  });

  it("updates and revokes a class counselor assignment", async () => {
    const updateResult = await updateClassCounselorAssignmentAction(
      10,
      7,
      "assignment-1",
      {},
      makeFormData({
        responsibility_type: "assistant",
        exceptional: "false",
        exception_reason: "",
      }),
    );

    const revokeResult = await revokeClassCounselorAssignmentAction(
      10,
      7,
      "assignment-1",
      {},
      new FormData(),
    );

    expect(updateResult.success).toBeTruthy();
    expect(revokeResult.success).toBeTruthy();
    expect(mockUpdateClassCounselorAssignment).toHaveBeenCalledWith(
      "assignment-1",
      {
        responsibility_type: "assistant",
        exceptional: false,
      },
    );
    expect(mockRevokeClassCounselorAssignment).toHaveBeenCalledWith(
      "assignment-1",
    );
  });
});
