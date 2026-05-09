"use client";

import { toast } from "sonner";
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Award,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getPipelineHistory, type PipelineHistoryEntry } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { useFormatDateTime } from "@/lib/format-locale";

function getPerformerName(
  entry: PipelineHistoryEntry,
  systemLabel: string,
): string {
  if (entry.performer?.first_name || entry.performer?.last_name) {
    return [entry.performer.first_name, entry.performer.last_name]
      .filter(Boolean)
      .join(" ");
  }
  if (entry.performed_by) return entry.performed_by;
  return systemLabel;
}

type ActionEntryConfig = {
  label: string;
  icon: React.ElementType;
  iconClass: string;
  dotClass: string;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineHistoryDialogProps {
  open: boolean;
  enrollmentId: number;
  memberName: string;
  onOpenChange: (open: boolean) => void;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const pipelineHistoryQueryKey = (enrollmentId: number) =>
  ["pipeline-history", enrollmentId] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineHistoryDialog({
  open,
  enrollmentId,
  memberName,
  onOpenChange,
}: PipelineHistoryDialogProps) {
  const t = useTranslations("investiture");
  const formatDate = useFormatDateTime();

  const actionConfig: Record<string, ActionEntryConfig> = {
    SUBMITTED: {
      label: t("historyDialog.actionSubmitted"),
      icon: Send,
      iconClass: "text-warning",
      dotClass: "bg-warning/20 border-warning/40",
    },
    CLUB_APPROVED: {
      label: t("historyDialog.actionClubApproved"),
      icon: CheckCircle2,
      iconClass: "text-[var(--chart-1)]",
      dotClass:
        "bg-[color-mix(in_oklch,var(--chart-1)_20%,transparent)] border-[color-mix(in_oklch,var(--chart-1)_40%,transparent)]",
    },
    COORDINATOR_APPROVED: {
      label: t("historyDialog.actionCoordinatorApproved"),
      icon: CheckCircle2,
      iconClass: "text-[var(--chart-2)]",
      dotClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_20%,transparent)] border-[color-mix(in_oklch,var(--chart-2)_40%,transparent)]",
    },
    FIELD_APPROVED: {
      label: t("historyDialog.actionFieldApproved"),
      icon: CheckCircle2,
      iconClass: "text-[var(--chart-3)]",
      dotClass:
        "bg-[color-mix(in_oklch,var(--chart-3)_20%,transparent)] border-[color-mix(in_oklch,var(--chart-3)_40%,transparent)]",
    },
    INVESTED: {
      label: t("historyDialog.actionInvested"),
      icon: Award,
      iconClass: "text-primary",
      dotClass: "bg-primary/20 border-primary/40",
    },
    REJECTED: {
      label: t("historyDialog.actionRejected"),
      icon: XCircle,
      iconClass: "text-destructive",
      dotClass: "bg-destructive/20 border-destructive/40",
    },
  };

  // Pipeline history is append-only — once fetched it never changes.
  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: pipelineHistoryQueryKey(enrollmentId),
    queryFn: async () => {
      try {
        return await getPipelineHistory(enrollmentId);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : t("historyDialog.errorLoad");
        toast.error(message);
        throw error;
      }
    },
    staleTime: Infinity,
    // Only fetch when the dialog is open.
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            {t("historyDialog.title")}
          </DialogTitle>
          <DialogDescription>{memberName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span>{t("historyDialog.emptyHistory")}</span>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {entries.map((entry, idx) => {
                const config = actionConfig[entry.action] ?? {
                  label: entry.action,
                  icon: Clock,
                  iconClass: "text-muted-foreground",
                  dotClass: "bg-muted border-border",
                };
                const Icon = config.icon;
                const isLast = idx === entries.length - 1;

                return (
                  <li key={entry.history_id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          config.dotClass,
                        )}
                      >
                        <Icon className={cn("size-3.5", config.iconClass)} />
                      </div>
                      {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className={cn("pb-4", isLast && "pb-0")}>
                      <p className="text-sm font-medium leading-tight">
                        {config.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getPerformerName(entry, t("historyDialog.system"))} &middot; {formatDate(entry.created_at)}
                      </p>
                      {entry.reason && (
                        <p className="mt-1.5 rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                          {entry.reason}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
