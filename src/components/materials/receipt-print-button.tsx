"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ReceiptPrintButton({
  comprobante,
  context,
}: ReceiptPrintButtonProps) {
  const handlePrint = () => {
    const html = buildReceiptPrintDocument(comprobante, context);
    const opened = openReceiptPrintWindow(html);
    if (!opened) {
      window.alert(
        "No se pudo abrir la vista de impresión. Revisá que el navegador permita ventanas emergentes.",
      );
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      Imprimir comprobante
    </Button>
  );
}
