import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { CamporeeSupplyCatalog, CamporeeSupplyPlan } from "@/lib/types/camporee-supplies";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetCatalog = vi.fn();
const mockListPlans = vi.fn();
const mockKitchen = vi.fn();
const mockCash = vi.fn();
const mockMarkPaid = vi.fn();
const mockHasPermission = vi.fn();

vi.mock("@/lib/api/camporee-supplies", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/camporee-supplies")>();
  return {
    ...original,
    getCamporeeSupplyCatalog: (...args: unknown[]) => mockGetCatalog(...args),
    listCamporeeSupplyPlans: (...args: unknown[]) => mockListPlans(...args),
    getCamporeeSupplyKitchenReport: (...args: unknown[]) => mockKitchen(...args),
    getCamporeeSupplyCashReport: (...args: unknown[]) => mockCash(...args),
    markCamporeeSupplyPaymentPaid: (...args: unknown[]) => mockMarkPaid(...args),
  };
});

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "lf-1", user_id: "lf-1" } }),
}));

vi.mock("@/lib/auth/permission-utils", () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CamporeeSuppliesTab } from "@/components/camporee-supplies/camporee-supplies-tab";

const STUB_CATALOG: CamporeeSupplyCatalog = {
  supply_edit_cutoff_local_time: "21:00",
  timezone: "America/Mexico_City",
  start_date: "2026-08-28",
  end_date: "2026-08-30",
  slots: [
    {
      slot_id: "slot-1",
      label: "Almuerzo",
      deliver_time: "13:00",
      sort_order: 1,
      active: true,
    },
  ],
  products: [
    {
      product_id: "prod-1",
      name: "Hielo",
      uom: "BAG",
      unit_cost_centavos: 1500,
      active: true,
    },
  ],
};

const STUB_PLAN: CamporeeSupplyPlan = {
  plan_id: "plan-1",
  club_section_id: 20,
  club_name: "Panteras",
  local_field_id: 1,
  status: "SUBMITTED",
  committed_total_centavos: 80000,
  net_centavos: 80000,
  cutoff: "21:00",
  timezone: "America/Mexico_City",
  lines: [
    {
      line_id: "line-1",
      date: "2026-08-29",
      slot_id: "slot-1",
      slot_label: "Almuerzo",
      deliver_time: "13:00",
      product_id: "prod-1",
      product_name: "Hielo",
      uom: "BAG",
      qty: "4.000",
      delivered_qty: "0.000",
      unit_cost_centavos: 1500,
      line_total_centavos: 6000,
    },
  ],
  payments: [
    {
      payment_id: "pay-1",
      kind: "PRINCIPAL",
      parent_id: null,
      folio_reference: "INS20260001",
      total_centavos: 80000,
      status: "ISSUED",
      note: null,
    },
  ],
};

function renderTab(camporeeType: "local" | "union" = "local") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeSuppliesTab camporeeId={3} camporeeType={camporeeType} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeSuppliesTab", () => {
  beforeEach(() => {
    mockGetCatalog.mockReset();
    mockListPlans.mockReset();
    mockKitchen.mockReset();
    mockCash.mockReset();
    mockMarkPaid.mockReset();
    mockHasPermission.mockReset();
    mockHasPermission.mockReturnValue(true);
    mockGetCatalog.mockResolvedValue(STUB_CATALOG);
    mockListPlans.mockResolvedValue([STUB_PLAN]);
    mockKitchen.mockResolvedValue({ timezone: "America/Mexico_City", date: null, rows: [] });
    mockCash.mockResolvedValue({ timezone: "America/Mexico_City", sections: [] });
    mockMarkPaid.mockResolvedValue({ ...STUB_PLAN.payments[0], status: "PAID" });
  });

  afterEach(() => {
    cleanup();
  });

  it("lists section plans with INS folios inside the camporee, not merch PED", async () => {
    renderTab("local");

    await waitFor(() => {
      expect(mockGetCatalog).toHaveBeenCalledWith(3, "local");
      expect(mockListPlans).toHaveBeenCalledWith(3, "local");
    });

    expect(await screen.findByText("INS20260001")).toBeInTheDocument();
    expect(screen.getByText("Panteras")).toBeInTheDocument();
    expect(screen.getByText("Hielo")).toBeInTheDocument();
    expect(screen.queryByText("PED20260001")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar plan/i })).not.toBeInTheDocument();
  });

  it("loads union camporee catalog and plans", async () => {
    renderTab("union");

    await waitFor(() => {
      expect(mockGetCatalog).toHaveBeenCalledWith(3, "union");
      expect(mockListPlans).toHaveBeenCalledWith(3, "union");
    });
  });

  it("marks an issued supply folio paid from plan detail", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("INS20260001");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    await user.click(screen.getByRole("button", { name: "Marcar pagado" }));

    await waitFor(() => {
      expect(mockMarkPaid).toHaveBeenCalledWith("pay-1");
    });
  });
});
