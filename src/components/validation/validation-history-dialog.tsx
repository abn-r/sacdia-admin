"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { History, Clock, CheckCircle2, XCircle } from "lucide-react";
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
  getValidationHistory,
  type ValidationEntityType,
  type ValidationHistoryEntry,
} from "@/lib/api/validation";
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

// ─── Action config (visual/structural only — labels resolved via t()) ─────────

const actionVisual: Record<
  string,
  { icon: React.ElementType; iconClass: string; dotClass: string }
> = {
  APPROVED: {
    icon: CheckCircle2,
    iconClass: "text-success",
    dotClass: "bg-success/20 border-success/40",
  },
  REJECTED: {
    icon: XCircle,
    iconClass: "text-destructive",
    dotClass: "bg-destructive/20 border-destructive/40",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationHistoryDialogProps {
  open: boolean;
  entityType: ValidationEntityType;
  entityId: number | string;
  title: string;
  onOpenChange: (open: boolean) => void;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const validationHistoryQueryKey = (
  entityType: ValidationEntityType,
  entityId: number | string,
) => ["validation-history", entityType, entityId] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationHistoryDialog({
  open,
  entityType,
  entityId,
  title,
  onOpenChange,
}: ValidationHistoryDialogProps) {
  const t = useTranslations("validation_admin");

  function getPerformerName(entry: ValidationHistoryEntry): string {
    if (entry.performer?.first_name || entry.performer?.last_name) {
      return [entry.performer.first_name, entry.performer.last_name]
        .filter(Boolean)
        .join(" ");
    }
    if (entry.performed_by) return entry.performed_by;
    return t("history.performer.system");
  }

  function getActionLabel(action: string): string {
    const known = ["APPROVED", "REJECTED"] as const;
    if ((known as readonly string[]).includes(action)) {
      return t(`history.actions.${action as (typeof known)[number]}`);
    }
    return action;
  }

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: validationHistoryQueryKey(entityType, entityId),
    queryFn: async () => {
      try {
        return await getValidationHistory(entityType, entityId);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : t("errors.loadHistory");
        toast.error(message);
        throw error;
      }
    },
    // Validation history is append-only — once fetched it never changes.
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
            {t("history.title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{title}</p>
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
              <span>{t("history.empty")}</span>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {entries.map((entry, idx) => {
                const visual = actionVisual[entry.action] ?? {
                  icon: Clock,
                  iconClass: "text-muted-foreground",
                  dotClass: "bg-muted border-border",
                };
                const Icon = visual.icon;
                const isLast = idx === entries.length - 1;

                return (
                  <li key={String(entry.history_id)} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          visual.dotClass,
                        )}
                      >
                        <Icon className={cn("size-3.5", visual.iconClass)} />
                      </div>
                      {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className={cn("pb-4", isLast && "pb-0")}>
                      <p className="text-sm font-medium leading-tight">
                        {getActionLabel(entry.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getPerformerName(entry)} &middot; {formatDate(entry.created_at)}
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
