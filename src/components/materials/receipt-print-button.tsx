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
    openReceiptPrintWindow(html);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
      <Printer data-icon="inline-start" />
      Imprimir comprobante
    </Button>
  );
}
