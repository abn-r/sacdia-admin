"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { InventoryConditionMark } from "@/components/inventory/inventory-condition-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { errorStateFromError } from "@/lib/api/error-state";
import { getInventoryHistory } from "@/lib/api/inventory";
import type { InventoryAction, InventoryHistoryEntry, InventoryItem } from "@/lib/api/inventory";
import { useFormatCurrency, useFormatDate, useFormatDateTime } from "@/lib/format-locale";

export type InventorySheetTab = "detail" | "history";

const FIELD_KEYS: Record<string, string> = {
  name: "history.field_name",
  description: "history.field_description",
  amount: "history.field_amount",
  inventory_category_id: "history.field_category",
  active: "history.field_active",
  condition: "history.field_condition",
  serial_number: "history.field_serial_number",
  purchase_date: "history.field_purchase_date",
  estimated_value: "history.field_estimated_value",
  location: "history.field_location",
  assigned_to: "history.field_assigned_to",
  notes: "history.field_notes",
};

function DetailRow({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{children}</dd>
    </div>
  );
}

function DetailPanel({ item }: { item: InventoryItem }) {
  const t = useTranslations("inventory");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const noValue = <span className="text-muted-foreground">{t("detail.no_value")}</span>;
  const text = (value?: string | null) => (value ? value : noValue);
  const categoryName =
    item.inventory_category?.name ??
    t("table.category_fallback", { id: item.inventory_category_id });

  return (
    <div className="space-y-6">
      <section aria-label={t("detail.section_general")} className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">{t("detail.section_general")}</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label={t("table.col_category")}>{categoryName}</DetailRow>
          <DetailRow label={t("table.col_amount")}>
            <span className="tabular-nums font-medium">{item.amount}</span>
          </DetailRow>
          <DetailRow label={t("form.condition")}>
            <InventoryConditionMark condition={item.condition} showNormal />
          </DetailRow>
          <DetailRow label={t("table.col_status")}>
            {item.active !== false ? t("status.active") : t("status.inactive")}
          </DetailRow>
          <DetailRow label={t("table.col_description")} wide>
            {text(item.description)}
          </DetailRow>
        </dl>
      </section>

      <section aria-label={t("detail.section_extra")} className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">{t("detail.section_extra")}</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label={t("form.serial_number")}>{text(item.serial_number)}</DetailRow>
          <DetailRow label={t("form.purchase_date")}>
            {item.purchase_date ? formatDate(item.purchase_date) : noValue}
          </DetailRow>
          <DetailRow label={t("form.estimated_value")}>
            {item.estimated_value === null || item.estimated_value === undefined ? (
              noValue
            ) : (
              <span className="tabular-nums">{formatCurrency(item.estimated_value)}</span>
            )}
          </DetailRow>
          <DetailRow label={t("form.assigned_to")}>{text(item.assigned_to)}</DetailRow>
          <DetailRow label={t("form.location")} wide>
            {text(item.location)}
          </DetailRow>
          <DetailRow label={t("form.notes")} wide>
            {text(item.notes)}
          </DetailRow>
        </dl>
      </section>
    </div>
  );
}

function performerName(entry: InventoryHistoryEntry, systemLabel: string): string {
  const { performed_by: by } = entry;
  if (by?.name || by?.paternal_last_name) {
    return [by.name, by.paternal_last_name].filter(Boolean).join(" ");
  }
  return systemLabel;
}

/** One line per change: what changed, before → after; who and when underneath. */
function HistoryList({ entries }: { entries: InventoryHistoryEntry[] }) {
  const t = useTranslations("inventory");
  const tc = useTranslations("ops.club.inventory.sheet");
  const formatDateTime = useFormatDateTime();

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" aria-hidden />
        <span>{t("history.empty")}</span>
      </div>
    );
  }

  const actionLabel: Record<InventoryAction, string> = {
    CREATE: t("history.action_create"),
    UPDATE: t("history.action_update"),
    DELETE: t("history.action_delete"),
  };
  const systemLabel = t("history.performed_by_system");

  return (
    <ol className="divide-y">
      {entries.map((entry) => {
        const fieldKey = entry.field_changed ? FIELD_KEYS[entry.field_changed] : undefined;
        const field = entry.field_changed
          ? fieldKey
            ? t(fieldKey as Parameters<typeof t>[0])
            : entry.field_changed
          : null;
        const showChange =
          entry.action === "UPDATE" && (entry.old_value !== null || entry.new_value !== null);

        return (
          <li key={entry.history_id} className="space-y-0.5 py-3">
            <p className="text-sm">
              <span className="font-medium">{field ?? actionLabel[entry.action]}</span>
              {showChange ? (
                <>
                  {": "}
                  <span className="text-muted-foreground">{entry.old_value ?? "—"}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only">{tc("historyTo")}</span>
                  <span>{entry.new_value ?? "—"}</span>
                </>
              ) : field ? (
                <span className="text-muted-foreground"> · {actionLabel[entry.action]}</span>
              ) : null}
            </p>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {performerName(entry, systemLabel)} · {formatDateTime(entry.created_at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function HistoryPanel({ inventoryId }: { inventoryId: number }) {
  const t = useTranslations("inventory");
  const [result, setResult] = useState<
    { id: number; entries: InventoryHistoryEntry[] } | { id: number; error: unknown } | null
  >(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getInventoryHistory(inventoryId)
      .then((entries) => {
        if (!cancelled) setResult({ id: inventoryId, entries });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ id: inventoryId, error: error ?? new Error("history") });
      });
    return () => {
      cancelled = true;
    };
  }, [inventoryId, attempt]);

  const current = result && result.id === inventoryId ? result : null;

  if (current && "error" in current) {
    const model = errorStateFromError(current.error);
    return (
      <ErrorState
        variant="inline"
        kind={model.kind}
        detail={model.detail}
        description={t("errors.load_history_failed")}
        onRetry={() => {
          setResult(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!current) {
    return (
      <div className="space-y-3 py-2" role="status" aria-busy="true">
        <span className="sr-only">{t("history.loading")}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }
  return <HistoryList entries={current.entries} />;
}

interface InventorySheetProps {
  item: InventoryItem | null;
  tab: InventorySheetTab;
  onTabChange: (tab: InventorySheetTab) => void;
  onOpenChange: (open: boolean) => void;
}

/** Detail and history of one item in a single sheet with two tabs. */
export function InventorySheet({ item, tab, onTabChange, onOpenChange }: InventorySheetProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("ops.club.inventory.sheet");

  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {item ? (
          <>
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle>{item.name}</SheetTitle>
              <SheetDescription>{t("detail.description")}</SheetDescription>
            </SheetHeader>
            <Tabs
              value={tab}
              onValueChange={(value) => onTabChange(value === "history" ? "history" : "detail")}
              className="flex-1 gap-0 px-6 py-4"
            >
              <TabsList aria-label={tc("tabsLabel")}>
                <TabsTrigger value="detail">{tc("detail")}</TabsTrigger>
                <TabsTrigger value="history">{tc("history")}</TabsTrigger>
              </TabsList>
              <TabsContent value="detail" className="pt-4">
                <DetailPanel item={item} />
              </TabsContent>
              <TabsContent value="history" className="pt-2">
                <HistoryPanel inventoryId={item.inventory_id} />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
