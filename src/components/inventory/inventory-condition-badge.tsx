"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_INVENTORY_CONDITION } from "@/lib/api/inventory";
import type { InventoryCondition } from "@/lib/api/inventory";

const CONDITION_VARIANT = {
  bueno: "success",
  regular: "warning",
  malo: "destructive",
} as const satisfies Record<InventoryCondition, "success" | "warning" | "destructive">;

interface InventoryConditionBadgeProps {
  condition?: InventoryCondition | null;
}

export function InventoryConditionBadge({ condition }: InventoryConditionBadgeProps) {
  const t = useTranslations("inventory.condition");
  const value = condition ?? DEFAULT_INVENTORY_CONDITION;

  return <Badge variant={CONDITION_VARIANT[value]}>{t(value)}</Badge>;
}
