"use client";

import { useTranslations } from "next-intl";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { DEFAULT_INVENTORY_CONDITION, type InventoryCondition } from "@/lib/api/inventory";

interface InventoryConditionMarkProps {
  condition?: InventoryCondition | null;
  /** Detail views state the normal condition in words; lists leave it unmarked. */
  showNormal?: boolean;
}

/** One mark per row, only for the exception: Regular or Malo. «Bueno» is not marked. */
export function InventoryConditionMark({ condition, showNormal = false }: InventoryConditionMarkProps) {
  const t = useTranslations("inventory.condition");
  const value = condition ?? DEFAULT_INVENTORY_CONDITION;

  if (showNormal && value === "bueno") return <span>{t("bueno")}</span>;

  return (
    <ExceptionStatus<InventoryCondition>
      value={value}
      normal={["bueno"]}
      labels={{ bueno: t("bueno"), regular: t("regular"), malo: t("malo") }}
      intents={{ regular: "warning", malo: "destructive" }}
    />
  );
}
