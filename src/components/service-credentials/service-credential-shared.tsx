"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import {
  getServiceCredentialErrorCode,
  type ServiceCredentialReviewStatus,
} from "@/lib/api/service-credentials";

/** Prefix of every review query: invalidating it refreshes list, counts and detail. */
export const SERVICE_CREDENTIALS_KEY = ["service-credentials", "review"] as const;
export const SERVICE_CREDENTIALS_LIST_KEY = [...SERVICE_CREDENTIALS_KEY, "list"] as const;
export const serviceCredentialDetailKey = (id: string) =>
  [...SERVICE_CREDENTIALS_KEY, "detail", id] as const;

const STATUS_INTENT: Record<ServiceCredentialReviewStatus, StatusIntent> = {
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export function ServiceCredentialStatusBadge({
  status,
}: {
  status: ServiceCredentialReviewStatus;
}) {
  const t = useTranslations("service_credentials.status");
  return <StatusBadge intent={STATUS_INTENT[status]} label={t(status)} size="sm" />;
}

/** Translated role slug; unknown slugs (a newer API) show as-is. */
export function useRoleLabel() {
  const t = useTranslations("service_credentials.roles");
  return (slug: string | null | undefined): string => {
    if (!slug) return "—";
    return t.has(slug as Parameters<typeof t.has>[0])
      ? t(slug as Parameters<typeof t>[0])
      : slug;
  };
}

export type ServiceCredentialErrorKind = "notFound" | "notPending" | "other";

/** What the screen must do after a failed review call. */
export function classifyServiceCredentialError(error: unknown): ServiceCredentialErrorKind {
  const code = getServiceCredentialErrorCode(error);
  if (code === "SERVICE_CREDENTIAL_NOT_FOUND") return "notFound";
  if (code === "SERVICE_CREDENTIAL_NOT_PENDING") return "notPending";
  if (!code && error instanceof ApiError) {
    if (error.status === 404) return "notFound";
    if (error.status === 409) return "notPending";
  }
  return "other";
}

export function useServiceCredentialErrorMessage() {
  const t = useTranslations("service_credentials.errors");
  return (error: unknown): string => {
    switch (getServiceCredentialErrorCode(error)) {
      case "SERVICE_CREDENTIAL_NOT_FOUND":
        return t("notFound");
      case "SERVICE_CREDENTIAL_NOT_PENDING":
        return t("notPending");
      case "SERVICE_CREDENTIAL_SELF_REVIEW":
        return t("selfReview");
      case "SERVICE_CREDENTIAL_DATE_INVALID":
        return t("dateInvalid");
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

/** Today as YYYY-MM-DD in the browser's local calendar. */
export function todayIsoDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
