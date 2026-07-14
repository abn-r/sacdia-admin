import type { StatusIntent } from "@/components/ui/status-badge";

export type HonorValidationStatus =
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type InvestitureStatus =
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_VALIDATION"
  | "CLUB_APPROVED"
  | "COORDINATOR_APPROVED"
  | "FIELD_APPROVED"
  | "APPROVED"
  | "REJECTED"
  | "INVESTIDO"
  | "EXPIRED";

const HONOR_STATUS_INTENT: Record<string, StatusIntent> = {
  IN_PROGRESS: "info",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

const INVESTITURE_STATUS_INTENT: Record<string, StatusIntent> = {
  IN_PROGRESS: "info",
  SUBMITTED_FOR_VALIDATION: "warning",
  CLUB_APPROVED: "warning",
  COORDINATOR_APPROVED: "warning",
  FIELD_APPROVED: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  INVESTIDO: "success",
  EXPIRED: "neutral",
};

export function honorStatusIntent(status: string): StatusIntent {
  return HONOR_STATUS_INTENT[status] ?? "neutral";
}

export function investitureStatusIntent(status: string): StatusIntent {
  return INVESTITURE_STATUS_INTENT[status] ?? "neutral";
}

export function isInvestedStatus(status: string): boolean {
  return status === "INVESTIDO";
}

export function formatEcclesiasticalYearLabel(
  year: { start_date: string; end_date: string } | null | undefined,
  locale: string,
): string {
  if (!year) return "—";
  try {
    const startYear = new Date(year.start_date).getFullYear();
    const endYear = new Date(year.end_date).getFullYear();
    return `${startYear}–${endYear}`;
  } catch {
    return "—";
  }
}

export function buildClubLabelByYear(
  assignments: unknown[] | undefined,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!Array.isArray(assignments)) return map;

  for (const raw of assignments) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const yearId =
      typeof record.ecclesiastical_year_id === "number"
        ? record.ecclesiastical_year_id
        : typeof record.ecclesiastical_year === "object" &&
            record.ecclesiastical_year &&
            typeof (record.ecclesiastical_year as Record<string, unknown>).year_id ===
              "number"
          ? ((record.ecclesiastical_year as Record<string, unknown>).year_id as number)
          : null;

    const club = record.club as Record<string, unknown> | undefined;
    const clubSections = record.club_sections as Record<string, unknown> | undefined;
    const nestedClub = clubSections?.clubs as Record<string, unknown> | undefined;

    const clubName =
      (typeof record.club_name === "string" && record.club_name) ||
      (typeof club?.name === "string" && club.name) ||
      (typeof nestedClub?.name === "string" && nestedClub.name) ||
      null;

    if (yearId != null && clubName) {
      map.set(yearId, clubName);
    }
  }

  return map;
}
