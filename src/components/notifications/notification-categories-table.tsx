"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Tags } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ErrorStateTableRow, type ErrorStateDetail, type ErrorStateKind } from "@/components/shared/error-state";
import type {
  NotificationCategory,
  NotificationCategorySetting,
} from "@/lib/notifications/categories";
import { updateNotificationCategorySettingAction } from "@/lib/notifications/category-settings-actions";

interface NotificationCategoriesTableProps {
  /** `null` when the load failed: the table then shows the error, never default switches. */
  categories: NotificationCategorySetting[] | null;
  failure?: { kind: ErrorStateKind; detail?: ErrorStateDetail } | null;
  /** `notifications-categories` / `update`. Without it the switches are read-only. */
  canEdit: boolean;
}

const COLUMN_COUNT = 4;

export function NotificationCategoriesTable({
  categories: initialCategories,
  failure,
  canEdit,
}: NotificationCategoriesTableProps) {
  const t = useTranslations("people.community.notifications.categories");
  const tOld = useTranslations("configuration.notifications.categories");
  const [categories, setCategories] = useState<NotificationCategorySetting[] | null>(
    initialCategories,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A reload from the server (router.refresh after a retry) replaces local state.
  const [lastInitial, setLastInitial] = useState(initialCategories);
  if (lastInitial !== initialCategories) {
    setLastInitial(initialCategories);
    setCategories(initialCategories);
  }

  // Category ids come from the API; unknown ones fall back to the raw id / no description.
  function nameOf(id: string): string {
    const key = `names.${id}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : id;
  }

  function descriptionOf(id: string): string | null {
    const key = `items.${id}` as Parameters<typeof tOld>[0];
    return tOld.has(key) ? tOld(key) : null;
  }

  function updateLocal(
    id: NotificationCategory,
    patch: Partial<Pick<NotificationCategorySetting, "mobileEnabled" | "defaultEnabled">>,
  ) {
    setCategories((current) =>
      current
        ? current.map((category) => (category.id === id ? { ...category, ...patch } : category))
        : current,
    );
  }

  function handleToggle(
    categoryId: NotificationCategory,
    field: "mobileEnabled" | "defaultEnabled",
    checked: boolean,
  ) {
    const previous = categories?.find((category) => category.id === categoryId);
    if (!previous || !canEdit) return;

    const rollback = previous[field];
    updateLocal(categoryId, { [field]: checked });
    setPendingKey(`${categoryId}:${field}`);

    startTransition(async () => {
      const result = await updateNotificationCategorySettingAction(
        {},
        { category: categoryId, [field]: checked },
      );

      setPendingKey(null);

      if (result.error) {
        updateLocal(categoryId, { [field]: rollback });
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? tOld("saveSuccess"));
    });
  }

  const headers = (
    <TableHeader>
      <TableRow>
        <TableHead>{t("colCategory")}</TableHead>
        <TableHead>{t("colMobile")}</TableHead>
        <TableHead>{t("colDefault")}</TableHead>
        <TableHead>{t("colUserCanDisable")}</TableHead>
      </TableRow>
    </TableHeader>
  );

  if (categories === null) {
    return (
      <DataTableShell>
        <Table>
          {headers}
          <TableBody>
            <ErrorStateTableRow
              colSpan={COLUMN_COUNT}
              kind={failure?.kind ?? "error"}
              detail={failure?.detail}
              icon={Tags}
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              retry
            />
          </TableBody>
        </Table>
      </DataTableShell>
    );
  }

  return (
    <DataTableShell>
      <Table>
        {headers}
        <TableBody>
          {categories.map((category) => {
            const name = nameOf(category.id);
            const description = descriptionOf(category.id);
            const mobilePending = isPending && pendingKey === `${category.id}:mobileEnabled`;
            const defaultPending = isPending && pendingKey === `${category.id}:defaultEnabled`;

            return (
              <TableRow key={category.id}>
                <TableCell className="whitespace-normal">
                  <span className="block font-medium text-sm">{name}</span>
                  {description ? (
                    <span className="block text-[13px] text-muted-foreground">{description}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${category.id}-mobile`}
                      checked={category.mobileEnabled}
                      disabled={!canEdit || mobilePending}
                      onCheckedChange={(checked) =>
                        handleToggle(category.id, "mobileEnabled", checked)
                      }
                      aria-label={tOld("mobileToggleAria", { category: name })}
                    />
                    <Label
                      htmlFor={`${category.id}-mobile`}
                      className="font-normal text-muted-foreground text-sm"
                    >
                      {category.mobileEnabled ? tOld("enabled") : tOld("disabled")}
                    </Label>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${category.id}-default`}
                      checked={category.defaultEnabled}
                      disabled={!canEdit || defaultPending}
                      onCheckedChange={(checked) =>
                        handleToggle(category.id, "defaultEnabled", checked)
                      }
                      aria-label={tOld("defaultToggleAria", { category: name })}
                    />
                    <Label
                      htmlFor={`${category.id}-default`}
                      className="font-normal text-muted-foreground text-sm"
                    >
                      {category.defaultEnabled ? tOld("enabled") : tOld("disabled")}
                    </Label>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {category.mobileAppVisible ? (
                    tOld("yes")
                  ) : (
                    <span className="text-muted-foreground">{tOld("no")}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
