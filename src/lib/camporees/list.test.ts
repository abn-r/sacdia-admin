import { describe, expect, it } from "vitest";
import {
  countOpenRegistration,
  filterCamporeeRows,
  matchesRange,
  registrationStateOf,
  toLocalListRow,
  toUnionListRow,
} from "./list";

const open = toLocalListRow({
  local_camporee_id: 1,
  name: "Camporee Valle Alto 2027",
  start_date: "2027-02-10",
  end_date: "2027-02-12",
  local_camporee_place: "Rancho El Encino",
  active: true,
});
const closed = toLocalListRow({
  local_camporee_id: 2,
  name: "Camporee Valle Alto 2026",
  start_date: "2026-02-12",
  end_date: "2026-02-14",
  club_registration_closed_at: "2026-01-10T00:00:00Z",
});
const inactive = toUnionListRow({
  union_camporee_id: 3,
  name: "Camporee de Unión",
  start_date: "2027-04-17",
  end_date: "2027-04-18",
  union_name: "Unión Norte",
  active: false,
});

describe("registrationStateOf", () => {
  it("marks inactive over closed over open", () => {
    expect(registrationStateOf({ active: false, closedAt: "2026-01-01" })).toBe("inactive");
    expect(registrationStateOf({ active: true, closedAt: "2026-01-01" })).toBe("closed");
    expect(registrationStateOf({ active: true, closedAt: null })).toBe("open");
  });
});

describe("rows", () => {
  it("maps ids, owner and place for both kinds", () => {
    expect(open).toMatchObject({ id: 1, kind: "local", place: "Rancho El Encino" });
    expect(inactive).toMatchObject({ id: 3, kind: "union", owner: "Unión Norte" });
  });

  it("counts only open registrations", () => {
    expect(countOpenRegistration([open, closed, inactive])).toBe(1);
  });
});

describe("filterCamporeeRows", () => {
  const rows = [open, closed, inactive];

  it("keeps upcoming and in-progress camporees by end date", () => {
    expect(matchesRange(open, "upcoming", "2027-02-11")).toBe(true);
    expect(matchesRange(open, "upcoming", "2027-02-13")).toBe(false);
    expect(matchesRange(open, "past", "2027-02-13")).toBe(true);
  });

  it("searches name, place and owner ignoring accents and case", () => {
    const result = filterCamporeeRows(rows, { query: "union norte", range: "all", today: "2027-01-01" });
    expect(result).toEqual([inactive]);
    expect(
      filterCamporeeRows(rows, { query: "encino", range: "all", today: "2027-01-01" }),
    ).toEqual([open]);
  });

  it("combines range and query", () => {
    expect(
      filterCamporeeRows(rows, { query: "valle alto", range: "past", today: "2027-01-01" }),
    ).toEqual([closed]);
  });
});
