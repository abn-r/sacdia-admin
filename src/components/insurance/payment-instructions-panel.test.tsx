import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { PaymentOrderConfig } from "@/lib/api/field-payment-orders";

const mockGetConfig = vi.fn();
const mockUpsertConfig = vi.fn();

vi.mock("@/lib/api/field-payment-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/field-payment-orders")>();
  return {
    ...original,
    getPaymentOrderConfig: (...args: unknown[]) => mockGetConfig(...args),
    upsertPaymentOrderConfig: (...args: unknown[]) => mockUpsertConfig(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { PaymentInstructionsPanel } from "@/components/insurance/payment-instructions-panel";

const STUB_CONFIG: PaymentOrderConfig = {
  field_payment_order_config_id: 1,
  local_field_id: 4,
  bank_name: "Banco Azteca",
  bank_account: "1234567890",
  bank_clabe: null,
  bank_holder: "Asociación Metropolitana",
  cash_instructions: null,
  extra_notes: null,
  active: true,
};

function renderPanel(requiresLocalFieldId = false) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentInstructionsPanel requiresLocalFieldId={requiresLocalFieldId} />
    </NextIntlClientProvider>,
  );
}

describe("PaymentInstructionsPanel", () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
    mockUpsertConfig.mockReset();
    mockGetConfig.mockResolvedValue(STUB_CONFIG);
    mockUpsertConfig.mockResolvedValue(STUB_CONFIG);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the current config for LF leadership on mount", async () => {
    renderPanel();

    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(undefined);
    });
    expect(await screen.findByDisplayValue("Banco Azteca")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
  });

  it("does not auto-load for global admins until a local field is chosen", async () => {
    const user = userEvent.setup();
    renderPanel(true);

    expect(mockGetConfig).not.toHaveBeenCalled();
    const loadButton = screen.getByRole("button", { name: "Cargar" });
    expect(loadButton).toBeDisabled();

    await user.type(screen.getByLabelText("Campo Local (ID)"), "4");
    expect(loadButton).not.toBeDisabled();
    await user.click(loadButton);

    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(4);
    });
  });

  it("blocks saving when neither bank nor cashier data is present", async () => {
    const user = userEvent.setup();
    mockGetConfig.mockResolvedValue({
      ...STUB_CONFIG,
      bank_account: null,
      bank_clabe: null,
      cash_instructions: null,
    });
    renderPanel();
    await screen.findByDisplayValue("Banco Azteca");

    expect(
      screen.getByText(
        "Configura al menos una vía de pago: datos bancarios o instrucciones de caja.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await user.type(
      screen.getByLabelText("Instrucciones de caja"),
      "Pagar en la caja del campo",
    );
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  it("saves the trimmed config", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByDisplayValue("Banco Azteca");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockUpsertConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          local_field_id: 4,
          bank_name: "Banco Azteca",
          bank_account: "1234567890",
          active: true,
        }),
      );
    });
  });
});
