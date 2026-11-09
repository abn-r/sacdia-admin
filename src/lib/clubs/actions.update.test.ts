import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

const mockRequireAdminUser = vi.fn();
const mockUpdateClub = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));
vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: () => mockRequireAdminUser(),
}));
vi.mock("@/lib/api/clubs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/clubs")>();
  return {
    ...actual,
    updateClub: (...args: unknown[]) => mockUpdateClub(...args),
  };
});

import { updateClubAction } from "@/lib/clubs/actions";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

describe("updateClubAction payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateClub.mockResolvedValue({});
    mockRequireAdminUser.mockResolvedValue(
      buildAuthUser({ id: "actor-1", roles: ["admin"], permissions: ["clubs:update"] }),
    );
  });

  it("sends cleared description/address and active=false", async () => {
    const result = await updateClubAction(
      7,
      {},
      makeFormData({ name: "Club X", description: "", address: "  ", active: "false" }),
    );

    expect(result).toEqual({ success: "success.club_updated" });
    expect(mockUpdateClub).toHaveBeenCalledWith(7, {
      name: "Club X",
      description: "",
      address: "",
      active: false,
    });
  });

  it("sends coordinates when both are present and never the territory ids", async () => {
    await updateClubAction(
      7,
      {},
      makeFormData({
        name: "Club X",
        active: "true",
        coordinates_lat: "19.4",
        coordinates_lng: "-99.1",
        local_field_id: "3",
        church_id: "4",
      }),
    );

    expect(mockUpdateClub).toHaveBeenCalledWith(7, {
      name: "Club X",
      active: true,
      coordinates: { lat: 19.4, lng: -99.1 },
    });
  });

  it("omits coordinates when the pair is empty", async () => {
    await updateClubAction(
      7,
      {},
      makeFormData({ name: "Club X", coordinates_lat: "", coordinates_lng: "" }),
    );

    expect(mockUpdateClub.mock.calls[0]?.[1]).not.toHaveProperty("coordinates");
  });

  it("rejects an empty name inline without calling the API", async () => {
    const result = await updateClubAction(7, {}, makeFormData({ name: "  " }));

    expect(result.fieldErrors?.name).toBe("validation.club_name_required");
    expect(mockUpdateClub).not.toHaveBeenCalled();
  });

  it("blocks users without clubs:update", async () => {
    mockRequireAdminUser.mockResolvedValue(
      buildAuthUser({ id: "actor-2", roles: ["director-lf"], permissions: [] }),
    );

    const result = await updateClubAction(7, {}, makeFormData({ name: "Club X" }));

    expect(result.error).toBeTruthy();
    expect(mockUpdateClub).not.toHaveBeenCalled();
  });
});
