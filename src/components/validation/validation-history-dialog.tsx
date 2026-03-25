"use client";

import { useState } from "react";
import { toast } from "sonner";
import { History, Clock, CheckCircle2, XCircle } from "lucide-react";
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

function getPerformerName(entry: ValidationHistoryEntry): string {
  if (entry.performer?.first_name || entry.performer?.last_name) {
    return [entry.performer.first_name, entry.performer.last_name]
      .filter(Boolean)
      .join(" ");
  }
  if (entry.performed_by) return entry.performed_by;
  return "Sistema";
}

const actionConfig: Record<
  string,
  { label: string; icon: React.ElementType; iconClass: string; dotClass: string }
> = {
  APPROVED: {
    label: "Aprobado",
    icon: CheckCircle2,
    iconClass: "text-success",
    dotClass: "bg-success/20 border-success/40",
  },
  REJECTED: {
    label: "Rechazado",
    icon: XCircle,
    iconClass: "text-destructive",
    dotClass: "bg-destructive/20 border-destructive/40",
  },
};

function getActionConfig(action: string) {
  return (
    actionConfig[action] ?? {
      label: action,
      icon: Clock,
      iconClass: "text-muted-foreground",
      dotClass: "bg-muted border-border",
    }
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationHistoryDialogProps {
  open: boolean;
  entityType: ValidationEntityType;
  entityId: number | string;
  title: string;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationHistoryDialog({
  open,
  entityType,
  entityId,
  title,
  onOpenChange,
}: ValidationHistoryDialogProps) {
  const [entries, setEntries] = useState<ValidationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadHistory() {
    if (loaded) return;
    setLoading(true);
    try {
      const data = await getValidationHistory(entityType, entityId);
      setEntries(data);
      setLoaded(true);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo cargar el historial";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      loadHistory();
    } else {
      setEntries([]);
      setLoaded(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            Historial de validación
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
              <span>No hay historial de validación aún.</span>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {entries.map((entry, idx) => {
                const config = getActionConfig(entry.action);
                const Icon = config.icon;
                const isLast = idx === entries.length - 1;

                return (
                  <li key={String(entry.history_id)} className="flex gap-3">
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
                      <p className="text-sm font-medium leading-tight">{config.label}</p>
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
