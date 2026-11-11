"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { getClubEnrollmentErrorCode, type ClubEnrollmentReviewStatus } from "@/lib/api/club-enrollment-review";

/** Prefix of every queue query: invalidating it refreshes list and counts. */
export const CLUB_ENROLLMENTS_KEY = ["club-enrollments", "validation"] as const;
export const CLUB_ENROLLMENTS_LIST_KEY = [...CLUB_ENROLLMENTS_KEY, "list"] as const;

const STATUS_INTENT: Record<ClubEnrollmentReviewStatus, StatusIntent> = {
  pending_validation: "warning",
  active: "success",
  rejected: "destructive",
};

export function ClubEnrollmentStatusBadge({ status }: { status: ClubEnrollmentReviewStatus }) {
  const t = useTranslations("club_enrollments.status");
  return <StatusBadge intent={STATUS_INTENT[status]} label={t(status)} size="sm" />;
}

/** Translated role slug; unknown slugs (a newer API) show as-is. */
export function useEnrollmentRoleLabel() {
  const t = useTranslations("club_enrollments.roles");
  return (slug: string | null | undefined): string => {
    if (!slug) return "—";
    return t.has(slug as Parameters<typeof t.has>[0])
      ? t(slug as Parameters<typeof t>[0])
      : slug;
  };
}

export type ClubEnrollmentErrorKind = "notFound" | "notPending" | "other";

/** What the screen must do after a failed review call. */
export function classifyClubEnrollmentError(error: unknown): ClubEnrollmentErrorKind {
  const code = getClubEnrollmentErrorCode(error);
  if (code === "CE_ENROLLMENT_NOT_FOUND") return "notFound";
  if (code === "CE_ENROLLMENT_NOT_PENDING") return "notPending";
  if (!code && error instanceof ApiError) {
    if (error.status === 404) return "notFound";
    if (error.status === 409) return "notPending";
  }
  return "other";
}

export function useClubEnrollmentErrorMessage() {
  const t = useTranslations("club_enrollments.errors");
  return (error: unknown): string => {
    switch (getClubEnrollmentErrorCode(error)) {
      case "CE_ENROLLMENT_NOT_FOUND":
        return t("notFound");
      case "CE_ENROLLMENT_NOT_PENDING":
        return t("notPending");
      case "CE_SELF_REVIEW":
        return t("selfReview");
      default:
        break;
    }
    if (error instanceof ApiError) {
      if (error.status === 404) return t("notFound");
      if (error.status === 409) return t("notPending");
      if (error.status === 401 || error.status === 403) return t("forbidden");
    }
    return t("generic");
  };
}
