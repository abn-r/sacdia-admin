import type { StatusIntent } from "@/components/ui/status-badge";

export const ENROLLMENT_STATUSES = [
  "ENROLLED",
  "IN_PROGRESS",
  "READY_FOR_CLOSEOUT",
  "SUBMITTED_FOR_FINAL_REVIEW",
  "APPROVED",
  "CERTIFIED",
  "WITHDRAWN",
  "EXPIRED",
  "CHANGES_REQUESTED",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** Values that are the normal course of an enrollment: not marked in the table. */
export const NORMAL_ENROLLMENT_STATUSES: EnrollmentStatus[] = ["ENROLLED", "IN_PROGRESS"];

export const ENROLLMENT_STATUS_INTENTS: Partial<Record<EnrollmentStatus, StatusIntent>> = {
  READY_FOR_CLOSEOUT: "info",
  SUBMITTED_FOR_FINAL_REVIEW: "info",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
  CERTIFIED: "success",
  WITHDRAWN: "neutral",
  EXPIRED: "destructive",
};

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
  return (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

/** "Name Paternal Maternal", skipping empty parts. */
export function enrollmentFullName(row: {
  name: string;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
}): string {
  return [row.name, row.paternal_last_name, row.maternal_last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
}
