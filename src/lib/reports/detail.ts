import type { MonthlyReport } from "@/lib/api/monthly-reports";

/** Club and club type named by the enrollment of a monthly report (GET :id only). */
export function monthlyReportClubParts(report: Pick<MonthlyReport, "club_enrollment">): {
  club: string | null;
  type: string | null;
} {
  const section = report.club_enrollment?.club_section;
  return {
    club: section?.clubs?.name?.trim() || null,
    type: section?.club_types?.name?.trim() || null,
  };
}

export type FrozenNote =
  /** Draft: the data still follows the club. */
  | { kind: "live" }
  /** Generated or sent: the data was frozen when the report was generated. */
  | { kind: "frozen"; generatedAt: string; submittedAt: string | null }
  /** Generated or sent but the API sent no date. */
  | { kind: "frozenNoDate" };

/** What the detail says about when the data was frozen. */
export function frozenNote(report: Pick<MonthlyReport, "status" | "generated_at" | "submitted_at">): FrozenNote {
  if (report.status === "draft") return { kind: "live" };
  if (!report.generated_at) return { kind: "frozenNoDate" };
  return { kind: "frozen", generatedAt: report.generated_at, submittedAt: report.submitted_at ?? null };
}
