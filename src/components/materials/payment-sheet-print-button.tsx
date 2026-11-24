"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/feedback/toast-retry";
import {
  buildPaymentSheetPrintDocument,
  openReceiptPrintWindow,
  type PaymentSheetPrintInput,
} from "@/lib/materials/receipt-print";

interface PaymentSheetPrintButtonProps {
  orden: PaymentSheetPrintInput;
}

export function PaymentSheetPrintButton({ orden }: PaymentSheetPrintButtonProps) {
  const t = useTranslations("ops.materials.print");

  const handlePrint = () => {
    const opened = openReceiptPrintWindow(buildPaymentSheetPrintDocument(orden));
    if (!opened) {
      toastError({ title: t("blocked"), description: t("blockedHint") });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      {t("sheet")}
    </Button>
  );
}
