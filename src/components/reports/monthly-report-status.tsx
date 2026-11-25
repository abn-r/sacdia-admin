"use client";

import { useTranslations } from "next-intl";
import { ExceptionStatus } from "@/components/shared/exception-status";
import {
  MONTHLY_STATUS_INTENT,
  MONTHLY_STATUS_NORMAL,
  type MonthlyReportStatus as Status,
} from "@/lib/reports/status";

/**
 * The status of a monthly report, the same in the list and in the detail:
 * «Borrador» and «Por enviar» are marked; «Enviado» is the normal state, so it
 * reads as plain text.
 */
export function MonthlyReportStatus({ status }: { status: Status }) {
  const t = useTranslations("evaluation.reports.status");
  const labels: Record<Status, string> = {
    draft: t("draft"),
    generated: t("generated"),
    submitted: t("submitted"),
  };

  if (MONTHLY_STATUS_NORMAL.includes(status)) {
    return <span className="text-sm text-muted-foreground">{labels[status]}</span>;
  }

  return (
    <ExceptionStatus
      value={status}
      normal={MONTHLY_STATUS_NORMAL}
      labels={labels}
      intents={MONTHLY_STATUS_INTENT}
    />
  );
}
