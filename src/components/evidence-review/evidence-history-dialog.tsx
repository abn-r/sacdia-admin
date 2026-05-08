"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { History, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getEvidenceHistory,
  type EvidenceType,
} from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// Action intent data (no user-facing strings here — labels resolved via t() below)
const actionIntentMap: Record<
  string,
  {
    labelKey: "action_approved" | "action_rejected" | "action_submitted";
    icon: React.ElementType;
    iconClass: string;
    dotClass: string;
  }
> = {
  APPROVED: {
    labelKey: "action_approved",
    icon: CheckCircle2,
    iconClass: "text-success",
    dotClass: "bg-success/20 border-success/40",
  },
  REJECTED: {
    labelKey: "action_rejected",
    icon: XCircle,
    iconClass: "text-destructive",
    dotClass: "bg-destructive/20 border-destructive/40",
  },
  SUBMITTED: {
    labelKey: "action_submitted",
    icon: Send,
    iconClass: "text-warning",
    dotClass: "bg-warning/20 border-warning/40",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceHistoryDialogProps {
  open: boolean;
  type: EvidenceType;
  id: number;
  memberName: string;
  onOpenChange: (open: boolean) => void;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const evidenceHistoryQueryKey = (type: EvidenceType, id: number) =>
  ["evidence-history", type, id] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function EvidenceHistoryDialog({
  open,
  type,
  id,
  memberName,
  onOpenChange,
}: EvidenceHistoryDialogProps) {
  const t = useTranslations("evidence_review.history");

  // Evidence history is append-only — once fetched it never changes.
  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: evidenceHistoryQueryKey(type, id),
    queryFn: async () => {
      try {
        return await getEvidenceHistory(type, id);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : t("error_load");
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
            {t("title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{memberName}</p>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span>{t("empty")}</span>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {entries.map((entry, idx) => {
                const intent = actionIntentMap[entry.action];
                const Icon = intent?.icon ?? Clock;
                const iconClass = intent?.iconClass ?? "text-muted-foreground";
                const dotClass = intent?.dotClass ?? "bg-muted border-border";
                const label = intent
                  ? t(intent.labelKey)
                  : entry.action;
                const isLast = idx === entries.length - 1;

                return (
                  <li key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          dotClass,
                        )}
                      >
                        <Icon className={cn("size-3.5", iconClass)} />
                      </div>
                      {!isLast && (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className={cn("pb-4", isLast && "pb-0")}>
                      <p className="text-sm font-medium leading-tight">
                        {label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.performed_by_name ?? t("system")} &middot;{" "}
                        {formatDate(entry.created_at)}
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
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
