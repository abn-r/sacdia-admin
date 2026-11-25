import { describe, expect, it } from "vitest";
import type { AdminMomItem } from "@/lib/api/member-of-month";
import { groupMemberOfMonth, memberInitials, momSectionLabel } from "./member-of-month";

const item = (over: Partial<AdminMomItem>): AdminMomItem => ({
  member_of_month_id: 1,
  user_id: "u1",
  user_name: "Camila Ibarra",
  user_image: null,
  club_section_id: 10,
  section_name: "Conquistadores",
  club_type: "Conquistadores",
  club_id: 3,
  club_name: "Club Orión",
  local_field: null,
  local_field_id: null,
  month: 10,
  year: 2026,
  total_points: 30,
  notified: true,
  created_at: "2026-11-01T00:00:00Z",
  ...over,
});

describe("groupMemberOfMonth", () => {
  it("keeps one row per section and month and puts a tie in the same row", () => {
    const groups = groupMemberOfMonth([
      item({ member_of_month_id: 1, user_name: "Iker Montes", club_section_id: 11, total_points: 28 }),
      item({ member_of_month_id: 2, user_name: "Renata Flores", club_section_id: 11, total_points: 28 }),
      item({ member_of_month_id: 3, club_section_id: 10 }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.winners.map((w) => w.user_name)).toEqual(["Iker Montes", "Renata Flores"]);
    expect(groups[0]?.totalPoints).toBe(28);
  });

  it("splits the same section across months", () => {
    const groups = groupMemberOfMonth([item({ month: 9 }), item({ month: 10, member_of_month_id: 2 })]);
    expect(groups).toHaveLength(2);
  });

  it("marks the row when any winner was not notified", () => {
    const [group] = groupMemberOfMonth([
      item({ notified: true }),
      item({ member_of_month_id: 2, notified: false }),
    ]);
    expect(group?.unnotified).toBe(true);
    expect(groupMemberOfMonth([item({})])[0]?.unnotified).toBe(false);
  });
});

describe("labels", () => {
  it("builds initials and the section label", () => {
    expect(memberInitials("camila ibarra rojas")).toBe("CI");
    expect(memberInitials(null)).toBe("?");
    expect(momSectionLabel({ clubName: "Club Orión", sectionName: "Aventureros" })).toBe("Club Orión · Aventureros");
    expect(momSectionLabel({ clubName: null, sectionName: "Aventureros" })).toBe("Aventureros");
  });
});
