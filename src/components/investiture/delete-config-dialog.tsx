"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteInvestitureConfig, type InvestitureConfig } from "@/lib/api/investiture";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeleteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: InvestitureConfig | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteConfigDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: DeleteConfigDialogProps) {
  const t = useTranslations("investiture");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!config) return;
    setIsDeleting(true);
    try {
      await deleteInvestitureConfig(config.investiture_config_id);
      toast.success(t("toasts.config_deactivated"));
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("errors.config_deactivate");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const localFieldName = config?.local_fields?.name ?? t("configTable.fieldFallback", {
    id: config?.local_field_id ?? "—",
  });
  const yearName =
    config?.ecclesiastical_years?.name ?? t("configTable.yearFallback", {
      id: config?.ecclesiastical_year_id ?? "—",
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteConfigDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {config ? (
              t("deleteConfigDialog.description", {
                localFieldName,
                yearName,
              })
            ) : (
              t("deleteConfigDialog.fallbackDescription")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("deleteConfigDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {t("deleteConfigDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
