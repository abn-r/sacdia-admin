import type { StatusIntent } from "@/components/ui/status-badge";

export const MONTHLY_STATUSES = ["draft", "generated", "submitted"] as const;
export type MonthlyReportStatus = (typeof MONTHLY_STATUSES)[number];

/**
 * One status mapping for the monthly report, used by the list and the detail:
 * only what is missing is marked («Borrador», «Por enviar»); «Enviado» is the
 * normal state and shows as plain text.
 */
export const MONTHLY_STATUS_NORMAL: MonthlyReportStatus[] = ["submitted"];

export const MONTHLY_STATUS_INTENT: Partial<Record<MonthlyReportStatus, StatusIntent>> = {
  draft: "warning",
  generated: "info",
};

export function isMonthlyStatus(value: unknown): value is MonthlyReportStatus {
  return MONTHLY_STATUSES.some((status) => status === value);
}

export function parseMonthlyStatus(raw: string | string[] | undefined): MonthlyReportStatus | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isMonthlyStatus(value) ? value : undefined;
}

export interface PendingCounts {
  /** Reports still being filled in. */
  drafts: number;
  /** Generated but not yet sent to the field. */
  toSend: number;
}

export function countPending(items: ReadonlyArray<{ status: string }>): PendingCounts {
  let drafts = 0;
  let toSend = 0;
  for (const item of items) {
    if (item.status === "draft") drafts += 1;
    else if (item.status === "generated") toSend += 1;
  }
  return { drafts, toSend };
}

export type MonthlyFinding =
  | { kind: "clear" }
  | { kind: "toSend"; toSend: number }
  | { kind: "drafts"; drafts: number }
  | { kind: "both"; toSend: number; drafts: number };

/** The one-line finding under the page title, computed from the counts. */
export function monthlyFinding({ drafts, toSend }: PendingCounts): MonthlyFinding {
  if (toSend > 0 && drafts > 0) return { kind: "both", toSend, drafts };
  if (toSend > 0) return { kind: "toSend", toSend };
  if (drafts > 0) return { kind: "drafts", drafts };
  return { kind: "clear" };
}

/** Years offered by the monthly filters: the current one and the four before. */
export function monthlyYearOptions(currentYear: number): number[] {
  return Array.from({ length: 5 }, (_, index) => currentYear - index);
}
