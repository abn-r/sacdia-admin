"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPaymentSheetPrintDocument,
  openReceiptPrintWindow,
  type PaymentSheetPrintInput,
} from "@/lib/materials/receipt-print";

interface PaymentSheetPrintButtonProps {
  orden: PaymentSheetPrintInput;
}

export function PaymentSheetPrintButton({ orden }: PaymentSheetPrintButtonProps) {
  const handlePrint = () => {
    const opened = openReceiptPrintWindow(buildPaymentSheetPrintDocument(orden));
    if (!opened) {
      window.alert(
        "No se pudo abrir la vista de impresión. Revisá que el navegador permita ventanas emergentes.",
      );
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      Imprimir ficha
    </Button>
  );
}
