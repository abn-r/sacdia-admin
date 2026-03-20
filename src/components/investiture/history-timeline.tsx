"use client";

import { CheckCircle2, XCircle, Send, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvestitureHistoryEntry, InvestitureAction } from "@/lib/api/investiture";

const actionConfig: Record<
  InvestitureAction,
  {
    label: string;
    icon: React.ElementType;
    iconClassName: string;
    dotClassName: string;
  }
> = {
  SUBMITTED: {
    label: "Enviado a validación",
    icon: Send,
    iconClassName: "text-warning",
    dotClassName: "bg-warning/20 border-warning/40",
  },
  APPROVED: {
    label: "Aprobado",
    icon: CheckCircle2,
    iconClassName: "text-success",
    dotClassName: "bg-success/20 border-success/40",
  },
  REJECTED: {
    label: "Rechazado",
    icon: XCircle,
    iconClassName: "text-destructive",
    dotClassName: "bg-destructive/20 border-destructive/40",
  },
  REINVESTITURE_REQUESTED: {
    label: "Re-investidura solicitada",
    icon: RefreshCw,
    iconClassName: "text-primary",
    dotClassName: "bg-primary/20 border-primary/40",
  },
};

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function getPerformerName(entry: InvestitureHistoryEntry): string {
  if (entry.performer?.first_name || entry.performer?.last_name) {
    return [entry.performer.first_name, entry.performer.last_name]
      .filter(Boolean)
      .join(" ");
  }
  if (entry.performed_by) return entry.performed_by;
  return "Sistema";
}

interface HistoryTimelineProps {
  entries: InvestitureHistoryEntry[];
}

export function HistoryTimeline({ entries }: HistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        <span>No hay historial de validación aún.</span>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {entries.map((entry, idx) => {
        const config = actionConfig[entry.action] ?? {
          label: entry.action,
          icon: Clock,
          iconClassName: "text-muted-foreground",
          dotClassName: "bg-muted border-border",
        };
        const Icon = config.icon;
        const isLast = idx === entries.length - 1;

        return (
          <li key={entry.history_id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  config.dotClassName,
                )}
              >
                <Icon className={cn("size-3.5", config.iconClassName)} />
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-border" />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p className="text-sm font-medium leading-tight">{config.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {getPerformerName(entry)} &middot; {formatDate(entry.created_at)}
              </p>
              {entry.comments && (
                <p className="mt-1.5 rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                  {entry.comments}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
