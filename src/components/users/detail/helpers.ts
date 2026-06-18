import type { AdminUserDetail } from "@/lib/api/admin-users";
import type { ClubAssignmentSummary } from "./hero";
import type { ContactEntry } from "./contacts-block";

const BLOOD_LABELS: Record<string, string> = {
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
};

export function formatBloodType(raw: string | null | undefined, fallback: string): string {
  if (!raw || raw.trim() === "") return fallback;
  return BLOOD_LABELS[raw] ?? raw;
}

export function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatDateLong(dateStr: string | null | undefined, locale = "es-MX"): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export interface BaptismDisplayLabels {
  yes: string;
  no: string;
  unknown?: string;
  yesWithDate: (date: string) => string;
}

export function formatBaptismDisplay(
  baptism: boolean | null | undefined,
  baptismDate: string | null | undefined,
  labels: BaptismDisplayLabels,
  locale = "es-MX",
): string {
  if (baptism === true) {
    return baptismDate
      ? labels.yesWithDate(formatDateLong(baptismDate, locale))
      : labels.yes;
  }

  if (baptism === false) {
    return labels.no;
  }

  return labels.unknown ?? "—";
}

export type TenureUnit = "days" | "months" | "years";

export function computeTenure(
  createdAt: string | null | undefined,
): { unit: TenureUnit; count: number; createdAt: string } | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return null;

  if (days < 30) {
    return { unit: "days", count: days, createdAt };
  }
  if (days < 365) {
    return { unit: "months", count: Math.floor(days / 30), createdAt };
  }
  return { unit: "years", count: Math.floor(days / 365), createdAt };
}

interface RawClubAssignment {
  assignment_id?: string | number | null;
  club_role_assignment_id?: number | string | null;
  club?: {
    name?: string | null;
    type?: string | null;
    district?: { name?: string | null } | null;
    districts?: { name?: string | null } | null;
    church?: { name?: string | null } | null;
    churches?: { name?: string | null } | null;
    club?: {
      name?: string | null;
      district_name?: string | null;
      church_name?: string | null;
      district?: { name?: string | null } | null;
      districts?: { name?: string | null } | null;
      church?: { name?: string | null } | null;
      churches?: { name?: string | null } | null;
    } | null;
  } | null;
  section?: {
    name?: string | null;
    club_type?: { name?: string | null } | null;
    club_types?: { name?: string | null } | null;
  } | null;
  role?: { role_name?: string | null } | null;
  role_name?: string | null;
  club_name?: string | null;
  section_name?: string | null;
  district_name?: string | null;
  church_name?: string | null;
  district?: { name?: string | null } | null;
  church?: { name?: string | null } | null;
}

function pickPresentString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function extractPrimaryAssignment(
  assignments: unknown[] | undefined,
  translateRole?: (name: string | null | undefined) => string,
): ClubAssignmentSummary | null {
  if (!Array.isArray(assignments) || assignments.length === 0) return null;
  const first = assignments[0] as RawClubAssignment;
  const clubName = first.club?.name ?? first.club?.club?.name ?? first.club_name ?? null;
  const sectionName =
    first.section?.name ??
    first.section?.club_type?.name ??
    first.section?.club_types?.name ??
    first.section_name ??
    null;
  const rawRole = first.role?.role_name ?? first.role_name ?? null;
  const roleName = translateRole ? translateRole(rawRole) || rawRole : rawRole;

  if (!clubName && !sectionName && !roleName) return null;
  return { clubName, sectionName, roleName };
}

export function extractAllAssignments(
  assignments: unknown[] | undefined,
  translateRole?: (name: string | null | undefined) => string,
): Array<{ id: string; clubName: string | null; sectionName: string | null; roleName: string | null }> {
  if (!Array.isArray(assignments)) return [];
  return assignments.map((raw, idx) => {
    const a = raw as RawClubAssignment;
    const rawRole = a.role?.role_name ?? a.role_name ?? null;
    return {
      id: String(a.assignment_id ?? a.club_role_assignment_id ?? idx),
      clubName: a.club?.name ?? a.club?.club?.name ?? a.club_name ?? null,
      sectionName:
        a.section?.name ??
        a.section?.club_type?.name ??
        a.section?.club_types?.name ??
        a.section_name ??
        null,
      roleName: translateRole ? translateRole(rawRole) || rawRole : rawRole,
    };
  });
}

export function extractAssignmentLocation(
  assignments: unknown[] | undefined,
): { districtName: string | null; churchName: string | null } {
  if (!Array.isArray(assignments)) {
    return { districtName: null, churchName: null };
  }

  let resolvedDistrictName: string | null = null;
  let resolvedChurchName: string | null = null;

  for (const raw of assignments) {
    const a = raw as RawClubAssignment;
    const districtName = pickPresentString(
      a.district_name,
      a.district?.name,
      a.club?.district?.name,
      a.club?.districts?.name,
      a.club?.club?.district_name,
      a.club?.club?.district?.name,
      a.club?.club?.districts?.name,
    );
    const churchName = pickPresentString(
      a.church_name,
      a.church?.name,
      a.club?.church?.name,
      a.club?.churches?.name,
      a.club?.club?.church_name,
      a.club?.club?.church?.name,
      a.club?.club?.churches?.name,
    );

    resolvedDistrictName = resolvedDistrictName ?? districtName;
    resolvedChurchName = resolvedChurchName ?? churchName;

    if (resolvedDistrictName && resolvedChurchName) {
      return {
        districtName: resolvedDistrictName,
        churchName: resolvedChurchName,
      };
    }
  }

  return { districtName: resolvedDistrictName, churchName: resolvedChurchName };
}

interface HealthEntry {
  name?: string | null;
}

export function extractHealthNames(items: unknown[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => (it as HealthEntry | null)?.name?.trim())
    .filter((v): v is string => Boolean(v));
}

interface RawEmergency {
  emergency_id?: string | number | null;
  name?: string | null;
  phone?: string | null;
  primary?: boolean | null;
  relationship_type_id?: number | string | null;
  relationship_type?: { name?: string | null } | null;
  relationship_types?: { name?: string | null } | null;
}

export function extractEmergencyContacts(
  raw: unknown[] | null | undefined,
): ContactEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx): ContactEntry | null => {
      const e = entry as RawEmergency;
      if (!e) return null;
      const name = e.name?.trim();
      if (!name) return null;
      const relationship =
        e.relationship_type?.name ??
        e.relationship_types?.name ??
        null;
      return {
        id: String(e.emergency_id ?? idx),
        name,
        phone: e.phone ?? null,
        relationship,
        primary: Boolean(e.primary),
      };
    })
    .filter((v): v is ContactEntry => v !== null)
    .sort((a, b) => Number(b.primary) - Number(a.primary));
}

interface RawLegal {
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  phone?: string | null;
  relationship_type_id?: number | string | null;
  relationship_type?: { name?: string | null } | null;
  relationship_types?: { name?: string | null } | null;
}

export function extractLegalRepresentative(
  value: Record<string, unknown> | null | undefined,
): { fullName: string; phone: string; relationship: string } | null {
  if (!value) return null;
  const v = value as RawLegal;
  const fullName = [v.name, v.paternal_last_name, v.maternal_last_name]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ");
  if (!fullName && !v.phone) return null;
  const relationship =
    v.relationship_type?.name ??
    v.relationship_types?.name ??
    "—";
  return {
    fullName: fullName || "—",
    phone: v.phone ?? "—",
    relationship,
  };
}

export function extractRoleNames(user: AdminUserDetail): string[] {
  const names: string[] = [];
  if (Array.isArray(user.roles)) names.push(...user.roles);
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      if (ur.roles?.role_name) names.push(ur.roles.role_name);
    }
  }
  return [...new Set(names)];
}
