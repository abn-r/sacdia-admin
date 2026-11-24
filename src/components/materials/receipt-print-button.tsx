"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/feedback/toast-retry";
import {
  buildReceiptPrintDocument,
  openReceiptPrintWindow,
  type ReceiptPrintContext,
} from "@/lib/materials/receipt-print";
import type { Comprobante } from "@/lib/types/materials";

interface ReceiptPrintButtonProps {
  comprobante: Comprobante;
  context: ReceiptPrintContext;
}

export function ReceiptPrintButton({ comprobante, context }: ReceiptPrintButtonProps) {
  const t = useTranslations("ops.materials.print");

  const handlePrint = () => {
    const html = buildReceiptPrintDocument(comprobante, context);
    const opened = openReceiptPrintWindow(html);
    if (!opened) {
      toastError({ title: t("blocked"), description: t("blockedHint") });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      {t("receipt")}
    </Button>
  );
}
