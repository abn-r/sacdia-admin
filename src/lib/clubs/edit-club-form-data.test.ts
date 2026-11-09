import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

const mockFetchClubById = vi.fn();

vi.mock("@/lib/clubs/fetch-detail", () => ({
  fetchClubById: (...args: unknown[]) => mockFetchClubById(...args),
}));

import { loadEditClubFormData } from "@/lib/clubs/edit-club-form-data";

const canUpdate = buildAuthUser({ roles: ["admin"], permissions: ["clubs:update"] });
const readOnly = buildAuthUser({ roles: ["admin"], permissions: ["clubs:read"] });

describe("loadEditClubFormData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchClubById.mockResolvedValue({
      club_id: 7,
      name: " Águilas ",
      description: null,
      address: "Calle 1",
      active: false,
      coordinates: { lat: 19.4, lng: -99.1 },
      local_field: { name: "Campo Centro" },
      districts: { name: "Distrito Norte" },
    });
  });

  it("returns null without clubs:update and never loads the club", async () => {
    expect(await loadEditClubFormData(readOnly, "7")).toBeNull();
    expect(mockFetchClubById).not.toHaveBeenCalled();
  });

  it("returns null for an invalid id or a missing club", async () => {
    expect(await loadEditClubFormData(canUpdate, "abc")).toBeNull();
    mockFetchClubById.mockResolvedValue(null);
    expect(await loadEditClubFormData(canUpdate, "7")).toBeNull();
  });

  it("maps the club to form values and read-only context", async () => {
    const data = await loadEditClubFormData(canUpdate, "7");

    expect(data).toMatchObject({
      clubId: 7,
      name: "Águilas",
      description: "",
      address: "Calle 1",
      active: false,
      lat: 19.4,
      lng: -99.1,
      localField: "Campo Centro",
      district: "Distrito Norte",
      church: undefined,
    });
  });
});
