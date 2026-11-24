import { describe, expect, it } from "vitest";
import type { CoordinationZone, CoordinatorAssignment } from "@/lib/api/coordination";
import {
  activeZoneDistricts,
  parseCoordinationTab,
  takenDistrictIds,
  zoneAssignments,
  zoneCoordinatorIds,
  zoneCoordinatorNames,
} from "./zone-view";

function zone(overrides: Partial<CoordinationZone> & { zone_id: number }): CoordinationZone {
  return {
    local_field_id: 1,
    name: `Zona ${overrides.zone_id}`,
    description: null,
    active: true,
    districts: [],
    ...overrides,
  };
}

function assignment(
  overrides: Partial<CoordinatorAssignment> & { assignment_id: string; user_id: string },
): CoordinatorAssignment {
  return {
    local_field_id: 1,
    assignment_type: "ZONE",
    zone_id: 1,
    club_type_id: 2,
    club_section_id: null,
    active: true,
    start_date: "2026-01-01",
    end_date: null,
    ...overrides,
  };
}

describe("parseCoordinationTab", () => {
  it("defaults to zones and only accepts the known tab", () => {
    expect(parseCoordinationTab(undefined)).toBe("zones");
    expect(parseCoordinationTab("assignments")).toBe("assignments");
    expect(parseCoordinationTab("other")).toBe("zones");
  });
});

describe("zone districts", () => {
  const north = zone({
    zone_id: 1,
    districts: [
      { zone_district_id: 1, zone_id: 1, districlub_type_id: 7, active: true },
      { zone_district_id: 2, zone_id: 1, districlub_type_id: 8, active: false },
    ],
  });
  const retired = zone({
    zone_id: 2,
    active: false,
    districts: [{ zone_district_id: 3, zone_id: 2, districlub_type_id: 9, active: true }],
  });

  it("keeps only active memberships", () => {
    expect(activeZoneDistricts(north).map((m) => m.districlub_type_id)).toEqual([7]);
  });

  it("frees the districts of an inactive zone", () => {
    expect([...takenDistrictIds([north, retired])]).toEqual([7]);
  });
});

describe("zone coordinators", () => {
  const north = zone({ zone_id: 1 });
  const list = [
    assignment({ assignment_id: "a", user_id: "u1", users: { user_id: "u1", email: null, name: "Gabriela", paternal_last_name: "Soto", maternal_last_name: null } }),
    assignment({ assignment_id: "b", user_id: "u1", club_type_id: 3 }),
    assignment({ assignment_id: "c", user_id: "u2", active: false }),
    assignment({ assignment_id: "d", user_id: "u3", zone_id: 2 }),
    assignment({ assignment_id: "e", user_id: "u4", assignment_type: "GENERAL", zone_id: null }),
  ];

  it("counts active assignments of that zone only", () => {
    expect(zoneAssignments(north, list).map((a) => a.assignment_id)).toEqual(["a", "b"]);
  });

  it("counts each person once", () => {
    expect(zoneCoordinatorIds(north, list)).toEqual(["u1"]);
    expect(zoneCoordinatorNames(north, list, (a) => a.user_id)).toEqual(["u1"]);
  });
});
