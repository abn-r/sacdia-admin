"use client";

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

export interface DecisionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investCount: number;
  rejectCount: number;
  isSubmitting: boolean;
  onConfirm: () => void;
}

/** Irreversible confirmation of the per-person decisions (AlertDialog, DS §destructive). */
export function DecisionConfirmDialog({
  open,
  onOpenChange,
  investCount,
  rejectCount,
  isSubmitting,
  onConfirm,
}: DecisionConfirmDialogProps) {
  const t = useTranslations("investiture_requests.confirmDialog");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-1 text-sm text-foreground">
          <li>{t("invest", { count: investCount })}</li>
          <li>{t("reject", { count: rejectCount })}</li>
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={(event) => {
              // Keep the dialog open until the request settles.
              event.preventDefault();
              onConfirm();
            }}
          >
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? t("confirming") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
