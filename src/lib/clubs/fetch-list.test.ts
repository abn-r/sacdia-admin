import { describe, expect, it } from "vitest";

import { buildClubsListParams } from "./fetch-list";

describe("buildClubsListParams", () => {
  it("sends the trimmed search text to the backend", () => {
    const params = buildClubsListParams({ page: 2, limit: 20, search: "  Orión " });

    expect(params.get("search")).toBe("Orión");
    expect(params.get("page")).toBe("2");
  });

  it("omits a blank search", () => {
    const params = buildClubsListParams({ page: 1, limit: 20, search: "   " });

    expect(params.has("search")).toBe(false);
  });
});
