"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { deleteFinance, isFinanceIncome, type Finance } from "@/lib/api/finances";
import { POST_CLOSING_NOTE_MAX } from "@/lib/api/finances";
import {
  getClosedPeriodErrorKey,
  normalizePostClosingNote,
} from "@/lib/finances/errors";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { useFormatCurrency } from "@/lib/format-locale";

export interface DeleteTransactionDialogProps {
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
  const [reason, setReason] = useState("");
  const [showReasonError, setShowReasonError] = useState(false);

  // A closed month cannot be changed silently: the backend needs a reason.
  const needsReason = finance?.period_closed === true;

  useEffect(() => {
    if (open) {
      setReason("");
      setShowReasonError(false);
    }
  }, [open, finance?.finance_id]);

  const formatAmount = (amount: number) =>
    formatFinanceAmount(amount, formatCurrency);

  async function handleDelete() {
    if (!finance) return;
    const note = normalizePostClosingNote(reason);
    if (needsReason && !note) {
      setShowReasonError(true);
      return;
    }
    setIsDeleting(true);
    try {
      if (needsReason && note) {
        await deleteFinance(finance.finance_id, note);
      } else {
        await deleteFinance(finance.finance_id);
      }
      toast.success(t("toasts.transaction_deleted"));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const closedKey = getClosedPeriodErrorKey(error);
      if (closedKey === "closed_note_required") setShowReasonError(true);
      toast.error(
        closedKey ? t(`errors.${closedKey}`) : t("errors.delete_transaction_failed"),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const isIncome = finance ? isFinanceIncome(finance) : false;

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
        {needsReason ? (
          <div className="space-y-1.5">
            <Label htmlFor="finance-delete-reason">
              {t("delete.reasonLabel")}{" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Textarea
              id="finance-delete-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={POST_CLOSING_NOTE_MAX}
              placeholder={t("delete.reasonPlaceholder")}
              aria-required="true"
              aria-invalid={showReasonError}
              aria-describedby="finance-delete-reason-help"
              className="min-h-[80px] resize-none"
            />
            <p
              id="finance-delete-reason-help"
              className={`text-xs ${showReasonError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {showReasonError ? t("validation.note_invalid") : t("delete.reasonHelper")}
            </p>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("delete.cancelButton")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Radix closes the dialog on action click; keep it open while deleting/invalid.
              event.preventDefault();
              void handleDelete();
            }}
            loading={isDeleting}
            variant="destructive-solid"
          >
            {t("delete.confirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
