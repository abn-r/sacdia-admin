import type {
  CoordinationZone,
  CoordinationZoneDistrict,
  CoordinatorAssignment,
} from "@/lib/api/coordination";

/**
 * Pure helpers for the coordination screens. They live outside the
 * `"use client"` modules so server components can import them too.
 */

export type CoordinationTab = "zones" | "assignments";

export function parseCoordinationTab(value: string | null | undefined): CoordinationTab {
  return value === "assignments" ? "assignments" : "zones";
}

/** Districts currently in the zone (inactive memberships are history). */
export function activeZoneDistricts(zone: CoordinationZone): CoordinationZoneDistrict[] {
  return (zone.districts ?? []).filter((membership) => membership.active);
}

export function districtLabel(membership: CoordinationZoneDistrict): string {
  return membership.districts?.name ?? `#${membership.districlub_type_id}`;
}

/** A district can only live in one active zone: ids already taken by an active zone. */
export function takenDistrictIds(zones: CoordinationZone[]): Set<number> {
  const ids = new Set<number>();
  for (const zone of zones) {
    if (!zone.active) continue;
    for (const membership of activeZoneDistricts(zone)) {
      ids.add(membership.districlub_type_id);
    }
  }
  return ids;
}

/** Active ZONE assignments pointing at the zone, one entry per assignment. */
export function zoneAssignments(
  zone: CoordinationZone,
  assignments: CoordinatorAssignment[],
): CoordinatorAssignment[] {
  return assignments.filter(
    (assignment) =>
      assignment.assignment_type === "ZONE" &&
      assignment.active &&
      assignment.zone_id === zone.zone_id,
  );
}

/** Distinct people who coordinate the zone through an active assignment. */
export function zoneCoordinatorIds(
  zone: CoordinationZone,
  assignments: CoordinatorAssignment[],
): string[] {
  return [...new Set(zoneAssignments(zone, assignments).map((a) => a.user_id))];
}

/**
 * Distinct people affected when something changes in the zone, with a display
 * name resolved by the caller.
 */
export function zoneCoordinatorNames(
  zone: CoordinationZone,
  assignments: CoordinatorAssignment[],
  nameOf: (assignment: CoordinatorAssignment) => string,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const assignment of zoneAssignments(zone, assignments)) {
    if (seen.has(assignment.user_id)) continue;
    seen.add(assignment.user_id);
    names.push(nameOf(assignment));
  }
  return names;
}
