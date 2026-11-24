import { describe, expect, it } from "vitest";
import { findActiveYear } from "@/lib/year-end/active-year";
import { groupImpactByClub, paginate } from "@/lib/year-end/impact";

const detail = (id: string, clubName: string, clubType: string) => ({
  club_enrollment_id: id,
  clubName,
  clubType,
  currentStatus: "active",
});

describe("groupImpactByClub", () => {
  it("collapses enrollments per club, listing each type once", () => {
    const rows = groupImpactByClub([
      detail("1", "Club Orión", "Conquistadores"),
      detail("2", "Club Orión", "Aventureros"),
      detail("3", "Club Orión", "Conquistadores"),
      detail("4", "Club Faro", "Guías Mayores"),
    ]);
    expect(rows).toEqual([
      { clubName: "Club Orión", clubTypes: ["Conquistadores", "Aventureros"], enrollments: 3 },
      { clubName: "Club Faro", clubTypes: ["Guías Mayores"], enrollments: 1 },
    ]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("slices a page and reports totals", () => {
    const page = paginate(items, 3, 10);
    expect(page.items).toEqual([21, 22, 23]);
    expect(page).toMatchObject({ page: 3, totalPages: 3, total: 23 });
  });

  it("clamps a page out of range", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({ page: 1, totalPages: 1, total: 0 });
  });
});

describe("findActiveYear", () => {
  it("returns the active year from a bare list or a data envelope", () => {
    const list = [
      { ecclesiastical_year_id: 1, name: "2026", active: false },
      { ecclesiastical_year_id: 2, name: "2027", active: true },
    ];
    expect(findActiveYear(list)).toEqual({ id: 2, name: "2027" });
    expect(findActiveYear({ data: list })).toEqual({ id: 2, name: "2027" });
  });

  it("returns null when none is active", () => {
    expect(findActiveYear([{ ecclesiastical_year_id: 1, name: "2026", active: false }])).toBeNull();
    expect(findActiveYear(undefined)).toBeNull();
  });
});
