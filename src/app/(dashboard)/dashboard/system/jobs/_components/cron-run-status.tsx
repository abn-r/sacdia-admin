"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The one status of a scheduled-job run. Only the negative state carries a
 * mark ("Falló"); the rest is plain text, and a job that never ran shows nothing.
 */
export function CronRunStatus({
  status,
  errorMessage,
}: {
  status: string | null | undefined;
  errorMessage?: string | null;
}) {
  const t = useTranslations("admin.system.status");

  if (!status) return <span className="text-sm text-muted-foreground">{t("never")}</span>;

  if (status === "failed") {
    const badge = <Badge variant="soft-destructive">{t("failed")}</Badge>;
    if (!errorMessage) return badge;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{badge}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm break-words font-mono text-xs">
            {errorMessage}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const label =
    status === "completed"
      ? t("completed")
      : status === "running"
        ? t("running")
        : status === "skipped"
          ? t("skipped")
          : status;
  return <span className="text-sm text-muted-foreground">{label}</span>;
}
