"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  getValidationHistory,
  type ValidationEntityType,
  type ValidationHistoryEntry,
} from "@/lib/api/validation";
import { useFormatDateTime } from "@/lib/format-locale";

const ACTION_ICON = {
  APPROVED: { icon: CheckCircle2, className: "text-success" },
  REJECTED: { icon: XCircle, className: "text-destructive" },
} as const;

function performerName(entry: ValidationHistoryEntry): string | null {
  const full = [entry.performer?.first_name, entry.performer?.last_name].filter(Boolean).join(" ");
  return full || entry.performed_by || null;
}

/** Validation log of one entity, rendered inside the review sheet. */
export function ValidationHistoryList({
  entityType,
  entityId,
}: {
  entityType: ValidationEntityType;
  entityId: number | string;
}) {
  const t = useTranslations("validation_admin");
  const formatDateTime = useFormatDateTime();
  const query = useQuery({
    queryKey: ["validation-history", entityType, String(entityId)],
    queryFn: () => getValidationHistory(entityType, entityId),
  });

  if (query.isPending) {
    return (
      <div className="space-y-2" role="status" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (query.isError) {
    const { kind, detail } = errorStateFromError(query.error);
    return (
      <ErrorState
        variant="inline"
        kind={kind}
        {...(detail ? { detail } : {})}
        title={t("errors.loadHistory")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("history.empty")}</p>;
  }

  return (
    <ol className="space-y-3">
      {query.data.map((entry) => {
        const visual = ACTION_ICON[entry.action as keyof typeof ACTION_ICON];
        const Icon = visual?.icon ?? Clock;
        const label =
          entry.action === "APPROVED" || entry.action === "REJECTED"
            ? t(`history.actions.${entry.action}`)
            : entry.action;
        return (
          <li key={String(entry.history_id)} className="flex gap-3">
            <Icon
              className={`mt-0.5 size-4 shrink-0 ${visual?.className ?? "text-muted-foreground"}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground">
                {performerName(entry) ?? t("history.performer.system")} &middot;{" "}
                {formatDateTime(entry.created_at)}
              </p>
              {entry.comment && (
                <p className="mt-1.5 rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                  {entry.comment}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
