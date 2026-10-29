import { describe, expect, it } from "vitest";
import { joinPaymentNotes, splitPaymentNotes } from "./payment-notes";

const ORDER = "6f1c2c3e-9a54-4c1a-8f0e-0b6f2d7a1c11";

describe("splitPaymentNotes", () => {
  it("hides the technical marker and reports the order id", () => {
    expect(splitPaymentNotes(`field_payment_order:${ORDER}`)).toEqual({
      userNotes: "",
      orderId: ORDER,
    });
  });

  it("keeps the text the user wrote next to the marker", () => {
    expect(splitPaymentNotes(`Pago en efectivo\nfield_payment_order:${ORDER}`)).toEqual({
      userNotes: "Pago en efectivo",
      orderId: ORDER,
    });
    expect(splitPaymentNotes(`field_payment_order:${ORDER}\nPago en efectivo`)).toEqual({
      userNotes: "Pago en efectivo",
      orderId: ORDER,
    });
  });

  it("leaves ordinary notes untouched", () => {
    expect(splitPaymentNotes("Pago parcial")).toEqual({ userNotes: "Pago parcial", orderId: null });
  });

  it("handles missing notes", () => {
    expect(splitPaymentNotes(null)).toEqual({ userNotes: "", orderId: null });
    expect(splitPaymentNotes(undefined)).toEqual({ userNotes: "", orderId: null });
    expect(splitPaymentNotes("")).toEqual({ userNotes: "", orderId: null });
  });
});

describe("joinPaymentNotes", () => {
  it("writes the marker back so the payment keeps its order link", () => {
    expect(joinPaymentNotes("", ORDER)).toBe(`field_payment_order:${ORDER}`);
    expect(joinPaymentNotes("  Revisado ", ORDER)).toBe(`Revisado\nfield_payment_order:${ORDER}`);
  });

  it("sends plain notes (or nothing) when there is no order", () => {
    expect(joinPaymentNotes("Revisado", null)).toBe("Revisado");
    expect(joinPaymentNotes("   ", null)).toBeUndefined();
    expect(joinPaymentNotes(undefined, null)).toBeUndefined();
  });

  it("round-trips through split", () => {
    const stored = `Cobrado\nfield_payment_order:${ORDER}`;
    const { userNotes, orderId } = splitPaymentNotes(stored);
    expect(joinPaymentNotes(userNotes, orderId)).toBe(stored);
  });
});
