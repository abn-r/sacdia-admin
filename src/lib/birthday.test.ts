import { describe, expect, it } from "vitest";

import {
  getBirthdayDismissalKey,
  getBirthdayParts,
  isBirthdayToday,
} from "./birthday";

describe("birthday helpers", () => {
  it("extracts calendar date parts from API date strings without timezone drift", () => {
    expect(getBirthdayParts("2000-06-03T00:00:00.000Z")).toEqual({
      month: 6,
      day: 3,
    });
  });

  it("matches today's local calendar day against the birthday month and day", () => {
    const today = new Date(2026, 5, 3, 12);

    expect(isBirthdayToday("2000-06-03", today)).toBe(true);
    expect(isBirthdayToday("2000-06-04", today)).toBe(false);
  });

  it("returns null for invalid birthday values", () => {
    expect(getBirthdayParts(null)).toBeNull();
    expect(getBirthdayParts("not-a-date")).toBeNull();
    expect(getBirthdayParts("2000-02-31")).toBeNull();
  });

  it("builds a dismissal key scoped to user, birthday date, and current year", () => {
    expect(
      getBirthdayDismissalKey({
        userId: "user-1",
        birthday: "2000-06-03",
        today: new Date(2026, 5, 3),
      }),
    ).toBe("sacdia:birthday:user-1:2026:06-03");
  });
});
