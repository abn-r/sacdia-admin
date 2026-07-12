import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  buildClubsListParams,
  fetchClubsList,
  getClubListId,
} from "@/lib/clubs/fetch-list";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  };
});

describe("club list helpers", () => {
  it("resolves club id from club_id or id", () => {
    expect(getClubListId({ club_id: 12 })).toBe(12);
    expect(getClubListId({ id: 8 })).toBe(8);
    expect(getClubListId({})).toBeNull();
  });
});

describe("buildClubsListParams", () => {
  it("includes search in query params when provided", () => {
    const params = buildClubsListParams({
      page: 2,
      limit: 20,
      search: "  Betel  ",
      active: true,
      localFieldId: 4,
    });

    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("20");
    expect(params.get("search")).toBe("Betel");
    expect(params.get("active")).toBe("true");
    expect(params.get("localFieldId")).toBe("4");
  });

  it("omits empty search", () => {
    const params = buildClubsListParams({ page: 1, limit: 20, search: "   " });
    expect(params.has("search")).toBe(false);
  });
});

describe("fetchClubsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns server items and meta without client-side filtering", async () => {
    mockApiRequest.mockResolvedValue({
      data: [
        { club_id: 1, name: "Club Alpha" },
        { club_id: 2, name: "Club Beta" },
      ],
      meta: { page: 1, limit: 20, total: 42, totalPages: 3 },
    });

    const result = await fetchClubsList({
      page: 1,
      limit: 20,
      search: "alpha",
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/clubs?page=1&limit=20&search=alpha");
    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 42,
      totalPages: 3,
    });
  });

  it("returns unavailable result for API errors", async () => {
    mockApiRequest.mockRejectedValue(new ApiError("Forbidden", 403, null));

    const result = await fetchClubsList({ page: 1, limit: 20 });

    expect(result.available).toBe(false);
    expect(result.error).toBe("Forbidden");
    expect(result.items).toEqual([]);
  });
});
