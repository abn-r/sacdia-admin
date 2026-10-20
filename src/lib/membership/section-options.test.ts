import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: (...args: unknown[]) => mockApiRequest(...args) };
});

import { ApiError } from "@/lib/api/client";
import {
  coordinatorScopeToSectionOptions,
  loadReviewSectionOptions,
  resolveClubGrantSections,
} from "@/lib/membership/section-options";
import type { AuthUser } from "@/lib/auth/types";

const scopeSection = (id: number, club: string | null, type: string | null) => ({
  club_section_id: id,
  name: type,
  club_type_id: 1,
  club_type_name: type,
  club_id: 1,
  club_name: club,
  district_id: null,
  district_name: null,
  local_field_id: null,
  local_field_name: null,
});

const scopePayload = (sections: ReturnType<typeof scopeSection>[]) => ({
  status: "success",
  data: {
    is_coordinator: sections.length > 0,
    club_section_ids: sections.map((s) => s.club_section_id),
    assignments: [],
    sections,
  },
});

const clubGrant = (
  sectionId: number,
  club: string,
  type: string,
  permissions: string[],
  roleName = "director",
) => ({
  assignment_id: `a-${sectionId}`,
  role_name: roleName,
  permissions,
  club: { club_id: 1, club_name: club },
  section: { club_section_id: sectionId, club_type_id: 1, club_type_name: type },
});

const userWith = (grants: {
  club_assignments?: unknown[];
  global_roles?: unknown[];
  direct_permissions?: string[];
}): AuthUser =>
  ({ id: "u1", email: "u@test.com", authorization: { grants } }) as unknown as AuthUser;

const APPROVE = "club_members:approve";
const VERIFY = "consent:verify";

const clubsPayload = {
  data: [
    {
      club_id: 10,
      name: "Club Halcones",
      club_sections: [
        { club_section_id: 20, club_type_id: 1, active: true, club_types: { name: "Aventureros" } },
        { club_section_id: 21, club_type_id: 2, active: false, club_types: { name: "Guías" } },
      ],
    },
  ],
};

function route(handlers: Record<string, () => unknown>) {
  mockApiRequest.mockImplementation(async (path: string) => {
    const handler = handlers[path];
    if (!handler) throw new Error(`unexpected ${path}`);
    return handler();
  });
}

describe("coordinatorScopeToSectionOptions", () => {
  it("labels each section `club · type` and falls back for missing names", () => {
    expect(
      coordinatorScopeToSectionOptions([
        scopeSection(7, "Club Águilas", "Conquistadores"),
        scopeSection(8, null, null),
      ]),
    ).toEqual([
      { club_section_id: 7, label: "Club Águilas · Conquistadores", mode: "verify-only" },
      { club_section_id: 8, label: "Club · Sección", mode: "verify-only" },
    ]);
  });
});

describe("resolveClubGrantSections", () => {
  it("splits the viewer's own club grants by the permission each carries", () => {
    const grants = resolveClubGrantSections(
      userWith({
        club_assignments: [
          clubGrant(30, "Club Águilas", "Conquistadores", [APPROVE, VERIFY]),
          clubGrant(31, "Club Águilas", "Aventureros", [VERIFY], "secretary"),
          clubGrant(32, "Club Águilas", "Guías", ["other:read"]),
        ],
      }),
    );

    expect(grants.approve).toEqual([
      { club_section_id: 30, label: "Club Águilas · Conquistadores", mode: "approve" },
    ]);
    expect(grants.verify).toEqual([
      { club_section_id: 30, label: "Club Águilas · Conquistadores", mode: "verify-only" },
      { club_section_id: 31, label: "Club Águilas · Aventureros", mode: "verify-only" },
    ]);
    expect(grants.approveViaUnscopedList).toBe(false);
  });

  it("ignores coordinator-role club grants (coordinator authority comes from the scope)", () => {
    const grants = resolveClubGrantSections(
      userWith({
        club_assignments: [clubGrant(40, "Club X", "Guías", [APPROVE, VERIFY], "coordinator")],
      }),
    );

    expect(grants.approve).toEqual([]);
    expect(grants.verify).toEqual([]);
  });

  it("flags a global-role or direct club_members:approve holder (admins keep the /clubs list)", () => {
    expect(
      resolveClubGrantSections(
        userWith({ global_roles: [{ role_name: "admin", permissions: [APPROVE] }] }),
      ).approveViaUnscopedList,
    ).toBe(true);
    expect(
      resolveClubGrantSections(userWith({ direct_permissions: [APPROVE] })).approveViaUnscopedList,
    ).toBe(true);
    expect(
      resolveClubGrantSections(
        userWith({ global_roles: [{ role_name: "coordinator", permissions: [VERIFY] }] }),
      ).approveViaUnscopedList,
    ).toBe(false);
  });

  it("tolerates a user without authorization grants", () => {
    expect(resolveClubGrantSections(null)).toEqual({
      approve: [],
      verify: [],
      approveViaUnscopedList: false,
    });
  });
});

describe("loadReviewSectionOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  const directorGrants = () =>
    resolveClubGrantSections(
      userWith({
        club_assignments: [clubGrant(20, "Club Halcones", "Aventureros", [APPROVE, VERIFY])],
      }),
    );

  it("plain director: own-club grant sections in approve mode, /clubs never called", async () => {
    route({});

    const result = await loadReviewSectionOptions("approve", { clubGrants: directorGrants() });

    expect(result).toEqual({
      available: true,
      sections: [{ club_section_id: 20, label: "Club Halcones · Aventureros", mode: "approve" }],
    });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("global approver (admin, no club grants): keeps the /clubs list in approve mode", async () => {
    route({ "/clubs": () => clubsPayload });
    const clubGrants = resolveClubGrantSections(
      userWith({ global_roles: [{ role_name: "admin", permissions: [APPROVE] }] }),
    );

    const result = await loadReviewSectionOptions("approve", { clubGrants });

    expect(result).toEqual({
      available: true,
      sections: [{ club_section_id: 20, label: "Club Halcones · Aventureros", mode: "approve" }],
    });
  });

  it("global approver whose /clubs fails is unavailable", async () => {
    route({
      "/clubs": () => {
        throw new ApiError("nope", 500, null);
      },
    });
    const clubGrants = resolveClubGrantSections(userWith({ direct_permissions: [APPROVE] }));

    const result = await loadReviewSectionOptions("approve", { clubGrants });

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("coordinator + director elsewhere: own sections approve, covered sections verify-only", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([
          scopeSection(7, "Club Águilas", "Conquistadores"),
          scopeSection(9, "Club Pumas", "Aventureros"),
        ]),
      "/clubs": () => clubsPayload,
    });

    const result = await loadReviewSectionOptions("approve", {
      clubGrants: directorGrants(),
      includeCoordinatorScope: true,
    });

    expect(result.available).toBe(true);
    expect(result.sections).toEqual([
      { club_section_id: 20, label: "Club Halcones · Aventureros", mode: "approve" },
      { club_section_id: 7, label: "Club Águilas · Conquistadores", mode: "verify-only" },
      { club_section_id: 9, label: "Club Pumas · Aventureros", mode: "verify-only" },
    ]);
    expect(mockApiRequest).not.toHaveBeenCalledWith("/clubs");
  });

  it("a section covered by the scope but NOT in the viewer's club grants stays verify-only even if /clubs lists it", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([scopeSection(20, "Club Halcones", "Aventureros")]),
      "/clubs": () => clubsPayload,
    });
    const clubGrants = resolveClubGrantSections(
      userWith({ club_assignments: [clubGrant(50, "Club Otro", "Guías", [APPROVE, VERIFY])] }),
    );

    const result = await loadReviewSectionOptions("approve", {
      clubGrants,
      includeCoordinatorScope: true,
    });

    expect(result.sections).toEqual([
      { club_section_id: 50, label: "Club Otro · Guías", mode: "approve" },
      { club_section_id: 20, label: "Club Halcones · Aventureros", mode: "verify-only" },
    ]);
  });

  it("a section in both the club approve grants and the scope is approve (club role authority)", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([scopeSection(20, "Club Halcones", "Aventureros")]),
    });

    const result = await loadReviewSectionOptions("approve", {
      clubGrants: directorGrants(),
      includeCoordinatorScope: true,
    });

    expect(result.sections).toEqual([
      { club_section_id: 20, label: "Club Halcones · Aventureros", mode: "approve" },
    ]);
  });

  it("approve mode: scope failing still returns the club grant sections", async () => {
    route({
      "/coordination/me/scope": () => {
        throw new ApiError("boom", 500, null);
      },
    });

    const result = await loadReviewSectionOptions("approve", {
      clubGrants: directorGrants(),
      includeCoordinatorScope: true,
    });

    expect(result.available).toBe(true);
    expect(result.sections.map((s) => s.club_section_id)).toEqual([20]);
  });

  it("approve mode: a failing scope with no club sections is unavailable", async () => {
    route({
      "/coordination/me/scope": () => {
        throw new ApiError("boom", 500, null);
      },
    });

    const result = await loadReviewSectionOptions("approve", {
      clubGrants: resolveClubGrantSections(userWith({})),
      includeCoordinatorScope: true,
    });

    expect(result.available).toBe(false);
    expect(result.sections).toEqual([]);
  });

  it("verify-only coordinator: only the scope sections, /clubs is never called", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([
          scopeSection(7, "Club Águilas", "Conquistadores"),
          scopeSection(9, "Club Pumas", "Aventureros"),
        ]),
      "/clubs": () => clubsPayload,
    });

    const result = await loadReviewSectionOptions("verify-only", {
      clubGrants: resolveClubGrantSections(userWith({})),
    });

    expect(result.available).toBe(true);
    expect(result.sections.map((s) => s.club_section_id)).toEqual([7, 9]);
    expect(result.sections.every((s) => s.mode === "verify-only")).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalledWith("/clubs");
  });

  it("verify-only: adds sections where a club role carries consent:verify, scope wins the duplicate", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([scopeSection(31, "Club Águilas", "Aventureros")]),
    });
    const clubGrants = resolveClubGrantSections(
      userWith({
        club_assignments: [
          clubGrant(31, "Club Águilas", "Aventureros", [VERIFY], "secretary"),
          clubGrant(32, "Club Águilas", "Guías", [VERIFY], "secretary"),
        ],
      }),
    );

    const result = await loadReviewSectionOptions("verify-only", { clubGrants });

    expect(result.sections).toEqual([
      { club_section_id: 31, label: "Club Águilas · Aventureros", mode: "verify-only" },
      { club_section_id: 32, label: "Club Águilas · Guías", mode: "verify-only" },
    ]);
    expect(mockApiRequest).not.toHaveBeenCalledWith("/clubs");
  });

  it("verify-only: unavailable with the error when the scope fails and there are no club sections", async () => {
    route({
      "/coordination/me/scope": () => {
        throw new ApiError("boom", 500, null);
      },
    });

    const result = await loadReviewSectionOptions("verify-only", {
      clubGrants: resolveClubGrantSections(userWith({})),
    });

    expect(result.available).toBe(false);
    expect(result.sections).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it("verify-only: a failing scope still returns the club consent:verify sections", async () => {
    route({
      "/coordination/me/scope": () => {
        throw new ApiError("boom", 500, null);
      },
    });
    const clubGrants = resolveClubGrantSections(
      userWith({ club_assignments: [clubGrant(32, "Club Águilas", "Guías", [VERIFY], "secretary")] }),
    );

    const result = await loadReviewSectionOptions("verify-only", { clubGrants });

    expect(result.available).toBe(true);
    expect(result.sections.map((s) => s.club_section_id)).toEqual([32]);
  });

  it("verify-only: an empty scope is an empty, available list", async () => {
    route({ "/coordination/me/scope": () => scopePayload([]) });

    const result = await loadReviewSectionOptions("verify-only", {
      clubGrants: resolveClubGrantSections(userWith({})),
    });

    expect(result).toMatchObject({ available: true, sections: [] });
  });
});
