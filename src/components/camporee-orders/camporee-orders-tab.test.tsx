import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { CamporeeOrder } from "@/lib/types/camporee-orders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockListCamporeeOrders = vi.fn();
const mockGetCamporeeOrder = vi.fn();

vi.mock("@/lib/api/camporee-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/camporee-orders")>();
  return {
    ...original,
    listCamporeeOrders: (...args: unknown[]) => mockListCamporeeOrders(...args),
    getCamporeeOrder: (...args: unknown[]) => mockGetCamporeeOrder(...args),
  };
});

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "reader-1", user_id: "reader-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CamporeeOrdersTab } from "@/components/camporee-orders/camporee-orders-tab";

const STUB_ORDER: CamporeeOrder = {
  camporee_order_id: "order-1",
  local_field_id: 1,
  club_id: 10,
  club_section_id: 20,
  local_camporee_id: 3,
  union_camporee_id: null,
  folio: 1,
  folio_reference: "PED20260001",
  status: "PAID",
  currency: "MXN",
  total_centavos: 19900,
  expires_at: "2026-08-27T00:00:00.000Z",
  issued_by_id: "issuer-1",
  approved_by_id: "reviewer-1",
  approved_at: "2026-08-13T00:00:00.000Z",
  authorized_without_proof: false,
  authorized_by_id: null,
  authorized_at: null,
  authorization_reason: null,
  delivered_to_section_by_id: null,
  delivered_to_section_at: null,
  bank_name: null,
  bank_account: null,
  bank_clabe: null,
  bank_holder: null,
  cash_instructions: null,
  extra_notes: null,
  created_at: "2026-08-12T00:00:00.000Z",
  modified_at: "2026-08-12T00:00:00.000Z",
  lines: [
    {
      camporee_order_line_id: "line-1",
      sequence: 1,
      camporee_member_id: 801,
      beneficiary_user_id: "ben-1",
      beneficiary_name_snapshot: "Ana Ruiz",
      offering_id: "off-1",
      product_id: "prod-1",
      option_id: "opt-1",
      product_title_snapshot: "Playera",
      option_label_snapshot: "M",
      qty: 1,
      unit_price_centavos: 19900,
      line_total_centavos: 19900,
      delivered_to_member_at: null,
      delivered_to_member_by_id: null,
    },
  ],
  summary: [
    {
      product_title_snapshot: "Playera",
      option_label_snapshot: "M",
      qty: 1,
      subtotal_centavos: 19900,
    },
  ],
  distribution_status: "NOT_STARTED",
};

function renderTab(camporeeType: "local" | "union" = "local") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeOrdersTab camporeeId={3} camporeeType={camporeeType} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeOrdersTab", () => {
  beforeEach(() => {
    mockListCamporeeOrders.mockReset();
    mockGetCamporeeOrder.mockReset();
    mockListCamporeeOrders.mockResolvedValue([STUB_ORDER]);
    mockGetCamporeeOrder.mockResolvedValue(STUB_ORDER);
  });

  afterEach(() => {
    cleanup();
  });

  it("lists all merchandise folios for a local camporee", async () => {
    renderTab("local");

    await waitFor(() => {
      expect(mockListCamporeeOrders).toHaveBeenCalledWith({ camporee_id: 3 });
    });
    expect(await screen.findByText("PED20260001")).toBeInTheDocument();
  });

  it("uses union_camporee_id filter for union camporees", async () => {
    renderTab("union");

    await waitFor(() => {
      expect(mockListCamporeeOrders).toHaveBeenCalledWith({
        union_camporee_id: 3,
      });
    });
  });

  it("shows summary before named lines in detail", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("PED20260001");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));

    await waitFor(() => {
      expect(mockGetCamporeeOrder).toHaveBeenCalledWith("order-1");
    });
    expect(await screen.findByText("Consolidado")).toBeInTheDocument();
    expect(screen.getByText(/Líneas nominadas/)).toBeInTheDocument();
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
  });
});
