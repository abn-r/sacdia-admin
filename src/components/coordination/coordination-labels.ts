import type { CoordinatorAssignment } from "@/lib/api/coordination";

export function formatCoordinatorName(user: {
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
  user_id?: string;
} | null | undefined): string {
  if (!user) return "";
  const parts = [
    user.name,
    user.paternal_last_name,
    user.maternal_last_name,
  ].filter((part): part is string => Boolean(part && part.trim()));
  if (parts.length > 0) return parts.join(" ");
  if (user.email?.trim()) return user.email.trim();
  return user.user_id ?? "";
}

export function formatAssignmentScope(
  assignment: CoordinatorAssignment,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (assignment.assignment_type === "GENERAL") {
    return t("targets.allLocalField");
  }

  if (assignment.assignment_type === "ZONE") {
    const zoneName =
      assignment.coordination_zones?.name ??
      t("targets.zoneFallback", { id: assignment.zone_id ?? 0 });
    const typeName =
      assignment.club_types?.name ??
      t("targets.clubTypeFallback", { id: assignment.club_type_id ?? 0 });
    return `${zoneName} · ${typeName}`;
  }

  const clubName =
    assignment.club_sections?.clubs?.name ?? t("targets.clubFallback");
  const sectionName =
    assignment.club_sections?.club_types?.name ??
    assignment.club_sections?.name ??
    t("targets.sectionFallback", { id: assignment.club_section_id ?? 0 });
  return `${clubName} · ${sectionName}`;
}

export function coordinationErrorMessage(
  reason: string | null,
  fallback: string,
  t: (key: string) => string,
): string {
  switch (reason) {
    case "director_coordinator_same_section_conflict":
      return t("errors.directorConflict");
    case "user_missing_coordinator_role":
      return t("errors.missingRole");
    case "district_already_in_active_zone":
      return t("errors.districtInZone");
    case "invalid_coordinator_assignment_shape":
      return t("errors.assignmentScopeRequired");
    default:
      return fallback;
  }
}
