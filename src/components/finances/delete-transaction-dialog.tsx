"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { useTranslations } from "next-intl";
import { deleteFinance, type Finance } from "@/lib/api/finances";
import { useFormatCurrency } from "@/lib/format-locale";

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finance: Finance | null;
  onSuccess: () => void;
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  finance,
  onSuccess,
}: DeleteTransactionDialogProps) {
  const t = useTranslations("finances");
  const formatCurrency = useFormatCurrency();
  const [isDeleting, setIsDeleting] = useState(false);

  function formatAmount(cents: number): string {
    return formatCurrency(cents / 100);
  }

  async function handleDelete() {
    if (!finance) return;
    setIsDeleting(true);
    try {
      await deleteFinance(finance.finance_id);
      toast.success(t("toasts.transaction_deleted"));
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error(t("errors.delete_transaction_failed"));
    } finally {
      setIsDeleting(false);
    }
  }

  const isIncome = finance?.finances_categories?.type === 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {finance ? (
              <>
                {t("delete.descriptionPre")}{" "}
                <strong className={isIncome ? "text-success" : "text-destructive"}>
                  {formatAmount(Math.abs(finance.amount))}
                </strong>
                {finance.description ? ` — ${finance.description}` : ""}.{" "}
                {t("delete.cannotUndo")}
              </>
            ) : (
              t("delete.descriptionFallback")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("delete.cancelButton")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {t("delete.confirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
