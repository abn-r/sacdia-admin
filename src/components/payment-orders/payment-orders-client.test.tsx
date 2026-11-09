import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("@/components/payment-orders/payment-orders-tray", () => ({
  PaymentOrdersTray: ({ initialOrderId }: { initialOrderId?: string | null }) => (
    <div data-testid="orders-tray">{initialOrderId ?? "none"}</div>
  ),
}));
vi.mock("@/components/payment-orders/payment-obligations-client", () => ({
  PaymentObligationsClient: () => <div data-testid="pending-tab" />,
}));
vi.mock("@/components/payment-orders/reassignments-tray", () => ({
  ReassignmentsTray: () => <div data-testid="reassignments-tab" />,
}));

import { PaymentOrdersClient } from "@/components/payment-orders/payment-orders-client";

const TABS = { pending: true, orders: true, reassignments: true };

function renderClient(initialOrderId?: string | null, tabs = TABS) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentOrdersClient tabs={tabs} initialOrderId={initialOrderId} />
    </NextIntlClientProvider>,
  );
}

describe("PaymentOrdersClient", () => {
  afterEach(() => cleanup());

  it("opens the pending tab by default", () => {
    renderClient();
    expect(screen.getByTestId("pending-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("orders-tray")).not.toBeInTheDocument();
  });

  it("selects the orders tab and forwards the orderId from the link", () => {
    renderClient("order-123");
    expect(screen.getByTestId("orders-tray")).toHaveTextContent("order-123");
    expect(screen.queryByTestId("pending-tab")).not.toBeInTheDocument();
  });

  it("switches to the orders tab when the link changes while mounted", () => {
    const view = renderClient();
    expect(screen.getByTestId("pending-tab")).toBeInTheDocument();

    view.rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <PaymentOrdersClient tabs={TABS} initialOrderId="order-456" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId("orders-tray")).toHaveTextContent("order-456");
    expect(screen.queryByTestId("pending-tab")).not.toBeInTheDocument();
  });

  it("keeps the first visible tab when the user cannot see orders", () => {
    renderClient("order-123", { ...TABS, orders: false });
    expect(screen.getByTestId("pending-tab")).toBeInTheDocument();
  });
});
