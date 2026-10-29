import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { CamporeePayment } from "@/lib/api/camporees";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mocks = vi.hoisted(() => ({
  updatePayment: vi.fn(),
  createPayment: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    createPayment: mocks.createPayment,
    updatePayment: mocks.updatePayment,
    uploadCamporeePaymentVoucher: vi.fn(),
    removeCamporeePaymentVoucher: vi.fn(),
  };
});

import { PaymentFormPage } from "@/components/camporees/payment-form-page";

const ORDER = "6f1c2c3e-9a54-4c1a-8f0e-0b6f2d7a1c11";

function paymentWith(notes: string | null, reference: string | null = "ORD20260004"): CamporeePayment {
  return {
    camporee_payment_id: "pay-1",
    camporee_member_id: 5,
    member_id: "5",
    amount: 250,
    payment_type: "inscription",
    reference,
    notes,
    status: "approved",
  };
}

function renderEdit(payment: CamporeePayment) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentFormPage
        mode="edit"
        camporeeId={70}
        initialMembers={[]}
        payment={payment}
        returnUrl="/dashboard/campamentos/70?tab=payments"
      />
    </NextIntlClientProvider>,
  );
}

async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: messages.shared.formModal.continue }));
  await user.click(await screen.findByRole("button", { name: messages.camporees.paymentDialog.saveChanges }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updatePayment.mockResolvedValue({});
});

afterEach(() => cleanup());

describe("PaymentFormPage - payment order marker", () => {
  it("does not show the technical marker as notes and explains the link instead", () => {
    renderEdit(paymentWith(`field_payment_order:${ORDER}`));

    const notes = screen.getByLabelText(messages.camporees.paymentDialog.labelNotes);
    expect(notes).toHaveValue("");
    expect(screen.queryByDisplayValue(/field_payment_order/)).not.toBeInTheDocument();
    expect(screen.getByText("Pagado con la orden ORD20260004.")).toBeInTheDocument();
  });

  it("falls back to a generic hint when the order folio is unknown", () => {
    renderEdit(paymentWith(`field_payment_order:${ORDER}`, null));
    expect(screen.getByText("Pagado con una orden de pago.")).toBeInTheDocument();
  });

  it("preserves the marker on save, with or without user notes", async () => {
    renderEdit(paymentWith(`field_payment_order:${ORDER}`));
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(messages.camporees.paymentDialog.labelNotes), "Revisado en caja");
    await save(user);

    await waitFor(() => expect(mocks.updatePayment).toHaveBeenCalledTimes(1));
    expect(mocks.updatePayment).toHaveBeenCalledWith(
      "pay-1",
      expect.objectContaining({ notes: `Revisado en caja\nfield_payment_order:${ORDER}` }),
    );
  });

  it("sends only the marker when the user leaves the notes empty", async () => {
    renderEdit(paymentWith(`field_payment_order:${ORDER}`));
    const user = userEvent.setup();

    await save(user);

    await waitFor(() => expect(mocks.updatePayment).toHaveBeenCalledTimes(1));
    expect(mocks.updatePayment).toHaveBeenCalledWith(
      "pay-1",
      expect.objectContaining({ notes: `field_payment_order:${ORDER}` }),
    );
  });

  it("shows ordinary notes unchanged and no order hint", async () => {
    renderEdit(paymentWith("Pago parcial", "TRANS-1"));

    expect(screen.getByLabelText(messages.camporees.paymentDialog.labelNotes)).toHaveValue("Pago parcial");
    expect(screen.queryByText(/Pagado con/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await save(user);
    await waitFor(() => expect(mocks.updatePayment).toHaveBeenCalledTimes(1));
    expect(mocks.updatePayment).toHaveBeenCalledWith(
      "pay-1",
      expect.objectContaining({ notes: "Pago parcial" }),
    );
  });
});
