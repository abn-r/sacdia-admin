"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useFormatDateTime } from "@/lib/format-locale";

// ─── Action config (visual/structural constants — labels resolved via t() inside component) ──

const ACTION_META: Record<
  InventoryAction,
  {
    badgeVariant: "success" | "default" | "destructive" | "secondary";
    icon: React.ElementType;
    iconClassName: string;
    dotClassName: string;
  }
> = {
  CREATE: {
    badgeVariant: "success",
    icon: PlusCircle,
    iconClassName: "text-success",
    dotClassName: "bg-success/20 border-success/40",
  },
  UPDATE: {
    badgeVariant: "default",
    icon: Pencil,
    iconClassName: "text-primary",
    dotClassName: "bg-primary/20 border-primary/40",
  },
  DELETE: {
    badgeVariant: "destructive",
    icon: Trash2,
    iconClassName: "text-destructive",
    dotClassName: "bg-destructive/20 border-destructive/40",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getPerformerName(
  entry: InventoryHistoryEntry,
  systemLabel: string,
): string {
  if (entry.performed_by?.name || entry.performed_by?.paternal_last_name) {
    return [entry.performed_by.name, entry.performed_by.paternal_last_name]
      .filter(Boolean)
      .join(" ");
  }
  return systemLabel;
}

function getFieldLabel(
  field: string | null,
  t: ReturnType<typeof useTranslations<"inventory">>,
): string {
  if (!field) return "";
  const keyMap: Record<string, string> = {
    name: "history.field_name",
    description: "history.field_description",
    amount: "history.field_amount",
    inventory_category_id: "history.field_category",
    active: "history.field_active",
  };
  const key = keyMap[field];
  return key ? t(key as Parameters<typeof t>[0]) : field;
}

// ─── Timeline ───────────────────────────────────────────────────────────────────

interface HistoryTimelineProps {
  entries: InventoryHistoryEntry[];
}

function HistoryTimeline({ entries }: HistoryTimelineProps) {
  const t = useTranslations("inventory");
  const formatDate = useFormatDateTime();

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        <span>{t("history.empty")}</span>
      </div>
    );
  }

  const actionLabelMap: Record<InventoryAction, string> = {
    CREATE: t("history.action_create"),
    UPDATE: t("history.action_update"),
    DELETE: t("history.action_delete"),
  };

  const systemLabel = t("history.performed_by_system");

  return (
    <ol className="relative space-y-0">
      {entries.map((entry, idx) => {
        const meta = ACTION_META[entry.action];
        const config = meta
          ? { ...meta, label: actionLabelMap[entry.action] }
          : {
              label: entry.action,
              badgeVariant: "secondary" as const,
              icon: Clock,
              iconClassName: "text-muted-foreground",
              dotClassName: "bg-muted border-border",
            };
        const Icon = config.icon;
        const isLast = idx === entries.length - 1;
        const fieldLabel = getFieldLabel(entry.field_changed, t);

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
                {getPerformerName(entry, systemLabel)} &middot; {formatDate(entry.created_at)}
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
  const t = useTranslations("inventory");
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
              : t("errors.load_history_failed"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, inventoryId, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("history.dialog_title")}
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
              {t("history.loading")}
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
