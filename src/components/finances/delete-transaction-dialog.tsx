"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import {
  POST_CLOSING_NOTE_MAX,
  POST_CLOSING_NOTE_MIN,
  deleteFinance,
  isFinanceIncome,
  type Finance,
} from "@/lib/api/finances";
import { getClosedPeriodErrorKey } from "@/lib/finances/errors";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { FINANCE_MONTH_KEYS } from "@/lib/finances/period";
import { useFormatCurrency } from "@/lib/format-locale";

export interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finance: Finance | null;
  onSuccess: () => void;
}

/**
 * Open month: plain confirmation. Closed month: the reason (5-500 characters)
 * is required and recorded in the audit trail.
 */
export function DeleteTransactionDialog({
  open,
  onOpenChange,
  finance,
  onSuccess,
}: DeleteTransactionDialogProps) {
  const t = useTranslations("finances");
  const tc = useTranslations("ops.club.finances.delete");
  const formatCurrency = useFormatCurrency();
  const [pending, setPending] = useState(false);

  const needsReason = finance?.period_closed === true;
  const isIncome = finance ? isFinanceIncome(finance) : false;

  const errorMessage = (error: unknown) => {
    const closedKey = getClosedPeriodErrorKey(error);
    return closedKey ? t(`errors.${closedKey}`) : t("errors.delete_transaction_failed");
  };

  const monthKey = finance ? FINANCE_MONTH_KEYS[finance.month - 1] : undefined;
  const monthLabel = finance && monthKey ? `${t(`months.${monthKey}`)} ${finance.year}` : "";

  const description = finance ? (
    <>
      {t("delete.descriptionPre")}{" "}
      <strong className={isIncome ? "text-success" : "text-destructive"}>
        {formatFinanceAmount(Math.abs(finance.amount), formatCurrency)}
      </strong>
      {finance.description ? ` — ${finance.description}` : ""}.{" "}
      {needsReason ? tc("closedNotice", { month: monthLabel }) : null}{" "}
      {t("delete.cannotUndo")}
    </>
  ) : (
    t("delete.descriptionFallback")
  );

  async function remove(reason?: string) {
    if (!finance) return;
    if (reason) await deleteFinance(finance.finance_id, reason);
    else await deleteFinance(finance.finance_id);
    toast.success(t("toasts.transaction_deleted"));
    onSuccess();
  }

  if (needsReason) {
    return (
      <ReasonDialog
        open={open}
        onOpenChange={onOpenChange}
        title={tc("closedTitle")}
        description={description}
        label={t("delete.reasonLabel")}
        placeholder={t("delete.reasonPlaceholder")}
        min={POST_CLOSING_NOTE_MIN}
        max={POST_CLOSING_NOTE_MAX}
        confirmLabel={t("delete.confirmButton")}
        pending={pending}
        onConfirm={async (reason) => {
          setPending(true);
          try {
            await remove(reason);
            onOpenChange(false);
          } catch (error) {
            toast.error(errorMessage(error));
          } finally {
            setPending(false);
          }
        }}
      />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("delete.title")}
      description={description}
      confirmLabel={t("delete.confirmButton")}
      cancelLabel={t("delete.cancelButton")}
      tone="destructive"
      onConfirm={async () => {
        try {
          await remove();
        } catch (error) {
          // ConfirmDialog keeps itself open and shows this message.
          throw new Error(errorMessage(error));
        }
      }}
    />
  );
}
