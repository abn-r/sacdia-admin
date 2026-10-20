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
} from "@/lib/membership/section-options";

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
      { club_section_id: 7, label: "Club Águilas · Conquistadores" },
      { club_section_id: 8, label: "Club · Sección" },
    ]);
  });
});

describe("loadReviewSectionOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approve mode: only the club sections of /clubs (no coordination call)", async () => {
    route({ "/clubs": () => clubsPayload });

    const result = await loadReviewSectionOptions("approve");

    expect(result).toEqual({
      available: true,
      sections: [{ club_section_id: 20, label: "Club Halcones · Aventureros" }],
    });
    expect(mockApiRequest).not.toHaveBeenCalledWith("/coordination/me/scope");
  });

  it("verify-only: the coordinator's covered sections come from /coordination/me/scope", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([
          scopeSection(7, "Club Águilas", "Conquistadores"),
          scopeSection(9, "Club Pumas", "Aventureros"),
        ]),
      "/clubs": () => ({ data: [] }),
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result.available).toBe(true);
    expect(result.sections.map((s) => s.club_section_id)).toEqual([7, 9]);
  });

  it("verify-only: merges club-scoped sections and dedupes by id", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([scopeSection(20, "Club Halcones", "Aventureros")]),
      "/clubs": () => clubsPayload,
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result.sections.map((s) => s.club_section_id)).toEqual([20]);
  });

  it("verify-only: a coordinator without /clubs access (403) still gets the scope sections", async () => {
    route({
      "/coordination/me/scope": () =>
        scopePayload([scopeSection(7, "Club Águilas", "Conquistadores")]),
      "/clubs": () => {
        throw new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" });
      },
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result.available).toBe(true);
    expect(result.sections.map((s) => s.club_section_id)).toEqual([7]);
  });

  it("verify-only: a non-coordinator falls back to the club sections", async () => {
    route({
      "/coordination/me/scope": () => scopePayload([]),
      "/clubs": () => clubsPayload,
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result.sections.map((s) => s.club_section_id)).toEqual([20]);
  });

  it("verify-only: unavailable with the error only when BOTH sources fail", async () => {
    route({
      "/coordination/me/scope": () => {
        throw new ApiError("boom", 500, null);
      },
      "/clubs": () => {
        throw new ApiError("nope", 500, null);
      },
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result.available).toBe(false);
    expect(result.sections).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it("verify-only: one source failing and the other empty is an empty (available) list", async () => {
    route({
      "/coordination/me/scope": () => scopePayload([]),
      "/clubs": () => {
        throw new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" });
      },
    });

    const result = await loadReviewSectionOptions("verify-only");

    expect(result).toMatchObject({ available: true, sections: [] });
  });
});
