import { describe, expect, it } from "vitest";
import { buildListParams } from "./admin-users";

describe("buildListParams", () => {
  it("sends sortBy=name and sortOrder=asc by default so the API sorts the full set", () => {
    expect(buildListParams({})).toEqual({
      sortBy: "name",
      sortOrder: "asc",
    });
  });

  it("forwards created_at desc when the caller requests the previous order", () => {
    expect(
      buildListParams({
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      }),
    ).toEqual({
      sortBy: "created_at",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    });
  });

  it("forwards the selected catalog role_name on the list query (multi-role match is server-side)", () => {
    expect(
      buildListParams({
        role: "member",
        page: 2,
        limit: 20,
      }),
    ).toEqual({
      role: "member",
      page: 2,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
    });
  });

  it("does not send role when the filter is unset (Todos los roles)", () => {
    expect(buildListParams({ page: 1, limit: 20 })).toEqual({
      page: 1,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
    });
  });

  it("does not collapse a user to a single role on the client", () => {
    const params = buildListParams({
      role: "secretary",
      page: 1,
      limit: 20,
    });

    expect(params.role).toBe("secretary");
    expect(params).not.toHaveProperty("roles");
    expect(params.sortBy).toBe("name");
    expect(params.sortOrder).toBe("asc");
  });
});
