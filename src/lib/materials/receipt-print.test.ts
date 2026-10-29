import { describe, expect, it } from "vitest";
import {
  buildPaymentSheetPrintDocument,
  buildReceiptPrintDocument,
  type PaymentSheetPrintInput,
} from "@/lib/materials/receipt-print";
import type { Comprobante } from "@/lib/types/materials";

const order: PaymentSheetPrintInput = {
  folio_referencia: "SOL20260006",
  id: "order-1",
  total_centavos: 7000,
  subtotal_centavos: 7000,
  envio_centavos: 0,
  entrega: "recoger",
  bank_name: "BBVA",
  bank_account_clabe: "111144446666222244",
  account_holder: "Sección Centro de Veracruz",
};

describe("buildPaymentSheetPrintDocument", () => {
  it("asks to pay while the order is pending", () => {
    const html = buildPaymentSheetPrintDocument({ ...order, estado: "aprobada" });

    expect(html).toContain("Aprobada — pendiente de pago");
    expect(html).toContain("Total a pagar");
    expect(html).toContain("Usa este folio como referencia");
    expect(html).toContain("Recoger en sucursal");
  });

  it("doesn't ask to pay a delivered order", () => {
    const html = buildPaymentSheetPrintDocument({ ...order, estado: "entregada" });

    expect(html).toContain("Entregada");
    expect(html).toContain("Total pagado");
    expect(html).not.toContain("Total a pagar");
    expect(html).toContain("ya está pagada");
  });

  it("warns against paying a cancelled order", () => {
    expect(buildPaymentSheetPrintDocument({ ...order, estado: "cancelada" })).toContain(
      "No realices ningún pago",
    );
  });
});

describe("buildReceiptPrintDocument", () => {
  it("groups the CLABE like the payment sheet", () => {
    const comprobante = {
      id: "c1",
      status: "aprobado",
      file_name: "comprobante.png",
      mime_type: "image/png",
      size_bytes: 100,
      monto_centavos: 7000,
      ref_bancaria_declarada: "REF-1",
      fecha_pago: "2026-10-26",
      signed_url: null,
      uploaded_by: "u1",
      validated_by: null,
      reject_reason: null,
      created_at: "2026-10-27T00:00:00Z",
      validated_at: null,
    } as Comprobante;

    const html = buildReceiptPrintDocument(comprobante, {
      orderFolio: "SOL20260006",
      orderTotalCentavos: 7000,
      bankAccountClabe: "111144446666222244",
    });

    expect(html).toContain("1111 4444 6666 2222 44");
  });
});
