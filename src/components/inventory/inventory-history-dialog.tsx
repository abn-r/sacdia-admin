"use client";

import { useEffect, useState } from "react";
import { PlusCircle, Pencil, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getInventoryHistory } from "@/lib/api/inventory";
import type { InventoryHistoryEntry, InventoryAction } from "@/lib/api/inventory";

// ─── Action config ──────────────────────────────────────────────────────────────

const actionConfig: Record<
  InventoryAction,
  {
    label: string;
    badgeVariant: "success" | "default" | "destructive" | "secondary";
    icon: React.ElementType;
    iconClassName: string;
    dotClassName: string;
  }
> = {
  CREATE: {
    label: "Creación",
    badgeVariant: "success",
    icon: PlusCircle,
    iconClassName: "text-success",
    dotClassName: "bg-success/20 border-success/40",
  },
  UPDATE: {
    label: "Actualización",
    badgeVariant: "default",
    icon: Pencil,
    iconClassName: "text-primary",
    dotClassName: "bg-primary/20 border-primary/40",
  },
  DELETE: {
    label: "Eliminación",
    badgeVariant: "destructive",
    icon: Trash2,
    iconClassName: "text-destructive",
    dotClassName: "bg-destructive/20 border-destructive/40",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

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

function getPerformerName(entry: InventoryHistoryEntry): string {
  if (entry.performed_by?.name || entry.performed_by?.paternal_last_name) {
    return [entry.performed_by.name, entry.performed_by.paternal_last_name]
      .filter(Boolean)
      .join(" ");
  }
  return "Sistema";
}

function formatFieldName(field: string | null): string {
  if (!field) return "";
  const labels: Record<string, string> = {
    name: "Nombre",
    description: "Descripción",
    amount: "Cantidad",
    inventory_category_id: "Categoría",
    active: "Estado",
  };
  return labels[field] ?? field;
}

// ─── Timeline ───────────────────────────────────────────────────────────────────

interface HistoryTimelineProps {
  entries: InventoryHistoryEntry[];
}

function HistoryTimeline({ entries }: HistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        <span>Este ítem no tiene historial de cambios aún.</span>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {entries.map((entry, idx) => {
        const config = actionConfig[entry.action] ?? {
          label: entry.action,
          badgeVariant: "secondary" as const,
          icon: Clock,
          iconClassName: "text-muted-foreground",
          dotClassName: "bg-muted border-border",
        };
        const Icon = config.icon;
        const isLast = idx === entries.length - 1;
        const fieldLabel = formatFieldName(entry.field_changed);

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
              {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-0")}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={config.badgeVariant} className="text-xs">
                  {config.label}
                </Badge>
                {fieldLabel && (
                  <span className="text-xs font-medium text-foreground">
                    {fieldLabel}
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {getPerformerName(entry)} &middot; {formatDate(entry.created_at)}
              </p>

              {/* old → new values (UPDATE only) */}
              {entry.action === "UPDATE" &&
                (entry.old_value !== null || entry.new_value !== null) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    {entry.old_value !== null && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive line-through">
                        {entry.old_value}
                      </span>
                    )}
                    {entry.old_value !== null && entry.new_value !== null && (
                      <span className="text-muted-foreground">→</span>
                    )}
                    {entry.new_value !== null && (
                      <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-success">
                        {entry.new_value}
                      </span>
                    )}
                  </div>
                )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────────

interface InventoryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: number | null;
  itemName?: string;
}

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  inventoryId,
  itemName,
}: InventoryHistoryDialogProps) {
  const [entries, setEntries] = useState<InventoryHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || inventoryId === null) {
      setEntries([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getInventoryHistory(inventoryId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el historial",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, inventoryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Historial de cambios
            {itemName && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                — {itemName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Cargando historial...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <HistoryTimeline entries={entries} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
