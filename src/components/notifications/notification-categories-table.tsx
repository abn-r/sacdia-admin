"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { toneBadgeProps } from "@/components/materials/badge-tones";
import type {
  NotificationCategory,
  NotificationCategorySetting,
} from "@/lib/notifications/categories";
import { updateNotificationCategorySettingAction } from "@/lib/notifications/category-settings-actions";

interface NotificationCategoriesTableProps {
  categories: NotificationCategorySetting[];
}

export function NotificationCategoriesTable({
  categories: initialCategories,
}: NotificationCategoriesTableProps) {
  const t = useTranslations("configuration.notifications.categories");
  const [categories, setCategories] =
    useState<NotificationCategorySetting[]>(initialCategories);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  function updateLocal(
    id: NotificationCategory,
    patch: Partial<Pick<NotificationCategorySetting, "mobileEnabled" | "defaultEnabled">>,
  ) {
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? { ...category, ...patch } : category,
      ),
    );
  }

  function handleToggle(
    categoryId: NotificationCategory,
    field: "mobileEnabled" | "defaultEnabled",
    checked: boolean,
  ) {
    const previous = categoryMap.get(categoryId);
    if (!previous) return;

    const rollback = previous[field];
    updateLocal(categoryId, { [field]: checked });
    setPendingKey(`${categoryId}:${field}`);

    startTransition(async () => {
      const result = await updateNotificationCategorySettingAction(
        {},
        {
          category: categoryId,
          [field]: checked,
        },
      );

      setPendingKey(null);

      if (result.error) {
        updateLocal(categoryId, { [field]: rollback });
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? t("saveSuccess"));
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colCategory")}</TableHead>
            <TableHead>{t("colMobile")}</TableHead>
            <TableHead>{t("colDefault")}</TableHead>
            <TableHead>{t("colMobileApp")}</TableHead>
            <TableHead>{t("colDescription")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => {
            const mobilePending =
              isPending && pendingKey === `${category.id}:mobileEnabled`;
            const defaultPending =
              isPending && pendingKey === `${category.id}:defaultEnabled`;

            return (
              <TableRow key={category.id}>
                <TableCell className="font-mono text-sm">{category.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${category.id}-mobile`}
                      checked={category.mobileEnabled}
                      disabled={mobilePending}
                      onCheckedChange={(checked) =>
                        handleToggle(category.id, "mobileEnabled", checked)
                      }
                      aria-label={t("mobileToggleAria", { category: category.id })}
                    />
                    <Label
                      htmlFor={`${category.id}-mobile`}
                      className="text-sm font-normal text-muted-foreground"
                    >
                      {category.mobileEnabled ? t("enabled") : t("disabled")}
                    </Label>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${category.id}-default`}
                      checked={category.defaultEnabled}
                      disabled={defaultPending}
                      onCheckedChange={(checked) =>
                        handleToggle(category.id, "defaultEnabled", checked)
                      }
                      aria-label={t("defaultToggleAria", { category: category.id })}
                    />
                    <Label
                      htmlFor={`${category.id}-default`}
                      className="text-sm font-normal text-muted-foreground"
                    >
                      {category.defaultEnabled ? t("enabled") : t("disabled")}
                    </Label>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    {...toneBadgeProps(
                      category.mobileAppVisible ? "success" : "neutral",
                    )}
                  >
                    {category.mobileAppVisible ? t("yes") : t("no")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t(`items.${category.id}`)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
