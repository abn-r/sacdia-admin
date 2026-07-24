"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ValidationTable } from "@/components/validation/validation-table";
import {
  getPendingValidations,
  type PendingValidation,
  type ValidationEntityType,
} from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";

interface ValidationQueuePanelProps {
  entityType: ValidationEntityType;
  initialItems: PendingValidation[];
}

export function ValidationQueuePanel({
  entityType,
  initialItems,
}: ValidationQueuePanelProps) {
  const t = useTranslations("validation_admin");
  const [items, setItems] = useState(initialItems);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getPendingValidations({ entity_type: entityType });
      setItems(data);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.refresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [entityType, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <p className="text-sm text-muted-foreground">
          {t("client.count", { count: items.length })}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isRefreshing}>
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {t("client.refresh")}
        </Button>
      </div>
      <ValidationTable validations={items} entityType={entityType} onRefresh={refresh} />
    </div>
  );
}
