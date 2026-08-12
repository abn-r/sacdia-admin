import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { PaymentOrder } from "@/lib/api/field-payment-orders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockListPaymentOrders = vi.fn();
const mockGetReviewQueue = vi.fn();
const mockGetPaymentOrder = vi.fn();

vi.mock("@/lib/api/field-payment-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/field-payment-orders")>();
  return {
    ...original,
    listPaymentOrders: (...args: unknown[]) => mockListPaymentOrders(...args),
    getPaymentOrdersReviewQueue: (...args: unknown[]) =>
      mockGetReviewQueue(...args),
    getPaymentOrder: (...args: unknown[]) => mockGetPaymentOrder(...args),
  };
});

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "reviewer-1", user_id: "reviewer-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { PaymentOrdersTray } from "@/components/payment-orders/payment-orders-tray";

export const STUB_ORDER: PaymentOrder = {
  field_payment_order_id: "0f0e0d0c-0b0a-4a4b-8c8d-1a2b3c4d5e6f",
  purpose: "INSURANCE",
  local_field_id: 1,
  club_id: 10,
  club_section_id: 20,
  folio: 1,
  folio_reference: "OP-2026-0001",
  insurance_cycle_config_id: 5,
  local_camporee_id: null,
  currency: "MXN",
  unit_cost_centavos: 15000,
  total_centavos: 30000,
  status: "PROOF_SUBMITTED",
  expires_at: "2026-08-27T00:00:00.000Z",
  issued_by_id: "issuer-1",
  approved_by_id: null,
  cancelled_by_id: null,
  created_at: "2026-08-12T00:00:00.000Z",
  lines: [
    {
      field_payment_order_line_id: "line-1",
      sequence: 1,
      beneficiary_user_id: "ben-1",
      unit_cost_centavos: 15000,
      purpose: "INSURANCE",
      purpose_ref_id: 5,
      insurance_assignment_id: null,
      camporee_member_id: null,
    },
    {
      field_payment_order_line_id: "line-2",
      sequence: 2,
      beneficiary_user_id: "ben-2",
      unit_cost_centavos: 15000,
      purpose: "INSURANCE",
      purpose_ref_id: 5,
      insurance_assignment_id: null,
      camporee_member_id: null,
    },
  ],
  proofs: [],
};

function renderTray() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentOrdersTray />
    </NextIntlClientProvider>,
  );
}

describe("PaymentOrdersTray", () => {
  beforeEach(() => {
    mockListPaymentOrders.mockReset();
    mockGetReviewQueue.mockReset();
    mockGetPaymentOrder.mockReset();
    mockGetReviewQueue.mockResolvedValue([STUB_ORDER]);
    mockListPaymentOrders.mockResolvedValue([]);
    mockGetPaymentOrder.mockResolvedValue(STUB_ORDER);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the review queue by default and renders order rows", async () => {
    renderTray();

    await waitFor(() => {
      expect(mockGetReviewQueue).toHaveBeenCalledWith({ purpose: undefined });
    });
    expect(await screen.findByText("OP-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Comprobante enviado")).toBeInTheDocument();
  });

  it("passes the purpose filter to the review queue", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("OP-2026-0001");

    await user.selectOptions(screen.getByLabelText("Propósito"), "CAMPOREE");

    await waitFor(() => {
      expect(mockGetReviewQueue).toHaveBeenCalledWith({ purpose: "CAMPOREE" });
    });
  });

  it("uses the list endpoint when a concrete status is selected", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("OP-2026-0001");

    await user.selectOptions(screen.getByLabelText("Estado"), "APPROVED");

    await waitFor(() => {
      expect(mockListPaymentOrders).toHaveBeenCalledWith({
        purpose: undefined,
        status: "APPROVED",
      });
    });
  });

  it("opens the order detail sheet when Revisar is clicked", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("OP-2026-0001");

    await user.click(screen.getByRole("button", { name: "Revisar" }));

    await waitFor(() => {
      expect(mockGetPaymentOrder).toHaveBeenCalledWith(
        STUB_ORDER.field_payment_order_id,
      );
    });
    expect(await screen.findByText("Detalle de la orden")).toBeInTheDocument();
  });
});
