import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { PaymentObligation } from "@/lib/types/payment-obligations";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockListPending = vi.fn();

vi.mock("@/lib/api/payment-obligations", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/payment-obligations")>();
  return {
    ...original,
    listPendingPaymentObligations: (...args: unknown[]) =>
      mockListPending(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { PaymentObligationsClient } from "@/components/payment-orders/payment-obligations-client";

const STUB_OBLIGATIONS: PaymentObligation[] = [
  {
    source: "CAMPOREE_ORDER",
    source_id: "camp-order-1",
    purpose: "CAMPOREE_MATERIALS",
    folio: "PED20260001",
    total_centavos: 19900,
    currency: "MXN",
    status: "ORDER_REVIEW",
    action_required: "WAIT_REVIEW",
    camporee: { type: "local", id: 3, name: "Camporee LF" },
    created_at: "2026-08-12T00:00:00.000Z",
  },
  {
    source: "CAMPOREE_ORDER",
    source_id: "camp-order-2",
    purpose: "CAMPOREE_MATERIALS",
    folio: "PED20260002",
    total_centavos: 9900,
    currency: "MXN",
    status: "PAYMENT_DUE",
    action_required: "UPLOAD_PROOF",
    camporee: { type: "local", id: 3, name: "Camporee LF" },
    created_at: "2026-08-13T00:00:00.000Z",
  },
  {
    source: "FIELD_PAYMENT_ORDER",
    source_id: "fpo-1",
    purpose: "CAMPOREE",
    folio: "OP-2026-0001",
    total_centavos: 20000,
    currency: "MXN",
    status: "UNDER_REVIEW",
    action_required: "WAIT_REVIEW",
    camporee: { type: "local", id: 3, name: "Camporee LF" },
    created_at: "2026-08-11T00:00:00.000Z",
  },
  {
    source: "MATERIAL_ORDER",
    source_id: "mat-1",
    purpose: "MATERIALS",
    folio: "MAT-2026-0010",
    total_centavos: 45000,
    currency: "MXN",
    status: "PAYMENT_DUE",
    action_required: "WAIT_REVIEW",
    camporee: null,
    created_at: "2026-08-10T00:00:00.000Z",
  },
];

function renderClient() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentObligationsClient />
    </NextIntlClientProvider>,
  );
}

describe("PaymentObligationsClient", () => {
  beforeEach(() => {
    mockListPending.mockReset();
    mockListPending.mockResolvedValue(STUB_OBLIGATIONS);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders independent rows for three obligation sources", async () => {
    renderClient();

    await waitFor(() => {
      expect(mockListPending).toHaveBeenCalled();
    });

    expect(await screen.findByText("PED20260001")).toBeInTheDocument();
    expect(screen.getByText("PED20260002")).toBeInTheDocument();
    expect(screen.getByText("OP-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("MAT-2026-0010")).toBeInTheDocument();
    expect(screen.getAllByText("Pedido camporee")).toHaveLength(2);
    expect(screen.getByText("Orden de inscripción")).toBeInTheDocument();
    expect(screen.getByText("Pedido de materiales")).toBeInTheDocument();
  });

  it("links each source to its owning surface", async () => {
    renderClient();
    await screen.findByText("PED20260001");

    expect(
      screen.getByRole("link", { name: "Ver en bandeja" }).getAttribute("href"),
    ).toContain("/dashboard/campamentos/pedidos/bandeja?orderId=camp-order-1");
    expect(
      screen.getByRole("link", { name: "Revisar inscripción" }).getAttribute("href"),
    ).toContain("/dashboard/payment-orders?orderId=fpo-1");
    expect(
      screen.getByRole("link", { name: "Ver pedido" }).getAttribute("href"),
    ).toContain("/dashboard/materials/request/mat-1");
  });
});
