import { describe, expect, it } from "vitest";
import { getClubListId } from "@/lib/clubs/fetch-list";

describe("club list helpers", () => {
  it("resolves club id from club_id or id", () => {
    expect(getClubListId({ club_id: 12 })).toBe(12);
    expect(getClubListId({ id: 8 })).toBe(8);
    expect(getClubListId({})).toBeNull();
  });
});
