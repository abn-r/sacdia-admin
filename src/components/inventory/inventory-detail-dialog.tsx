"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryConditionBadge } from "@/components/inventory/inventory-condition-badge";
import { useFormatCurrency, useFormatDate } from "@/lib/format-locale";
import type { InventoryItem } from "@/lib/api/inventory";

interface DetailRowProps {
  label: string;
  children: ReactNode;
  wide?: boolean;
}

function DetailRow({ label, children, wide }: DetailRowProps) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{children}</dd>
    </div>
  );
}

interface InventoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

export function InventoryDetailDialog({
  open,
  onOpenChange,
  item,
}: InventoryDetailDialogProps) {
  const t = useTranslations("inventory");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  if (!item) return null;

  const noValue = (
    <span className="text-muted-foreground">{t("detail.no_value")}</span>
  );
  const text = (value?: string | null) => (value ? value : noValue);
  const categoryName =
    item.inventory_category?.name ??
    t("table.category_fallback", { id: item.inventory_category_id });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{t("detail.description")}</DialogDescription>
        </DialogHeader>

        <section aria-label={t("detail.section_general")} className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">
            {t("detail.section_general")}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow label={t("table.col_category")}>
              <Badge variant="secondary">{categoryName}</Badge>
            </DetailRow>
            <DetailRow label={t("table.col_amount")}>
              <span className="tabular-nums font-medium">{item.amount}</span>
            </DetailRow>
            <DetailRow label={t("form.condition")}>
              <InventoryConditionBadge condition={item.condition} />
            </DetailRow>
            <DetailRow label={t("table.col_status")}>
              <Badge variant={item.active !== false ? "default" : "outline"}>
                {item.active !== false ? t("status.active") : t("status.inactive")}
              </Badge>
            </DetailRow>
            <DetailRow label={t("table.col_description")} wide>
              {text(item.description)}
            </DetailRow>
          </dl>
        </section>

        <section aria-label={t("detail.section_extra")} className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">
            {t("detail.section_extra")}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow label={t("form.serial_number")}>
              {text(item.serial_number)}
            </DetailRow>
            <DetailRow label={t("form.purchase_date")}>
              {item.purchase_date ? formatDate(item.purchase_date) : noValue}
            </DetailRow>
            <DetailRow label={t("form.estimated_value")}>
              {item.estimated_value === null || item.estimated_value === undefined ? (
                noValue
              ) : (
                <span className="tabular-nums">
                  {formatCurrency(item.estimated_value)}
                </span>
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("detail.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
