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
    openReceiptPrintWindow(buildPaymentSheetPrintDocument(orden));
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      Imprimir ficha
    </Button>
  );
}
