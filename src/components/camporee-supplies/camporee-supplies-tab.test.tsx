import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
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

// Gates come from the screen catalog (`campamentos-list-*` supplies.*), so the
// actor carries real effective permissions instead of a mocked helper.
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "lf-1",
      user_id: "lf-1",
      email: "lf@example.com",
      roles: ["director-lf"],
      authorization: {
        grants: { global_roles: [{ role_name: "director-lf" }] },
        effective: {
          permissions: [
            "camporee-supplies:read",
            "camporee-supplies:configure",
            "camporee-supplies:review-pay",
            "camporee-supplies:deliver",
          ],
        },
      },
    },
  }),
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

    // Confirmation first: nothing is recorded until the operator confirms.
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/INS20260001/)).toBeInTheDocument();
    expect(mockMarkPaid).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar pago" }));

    await waitFor(() => {
      expect(mockMarkPaid).toHaveBeenCalledWith("pay-1");
    });
  });

  it("does not mark paid when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("INS20260001");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    await user.click(screen.getByRole("button", { name: "Marcar pagado" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(mockMarkPaid).not.toHaveBeenCalled();
  });

  it("hides delivery controls on a fully delivered line and keeps them on open lines", async () => {
    const user = userEvent.setup();
    const base = STUB_PLAN.lines[0];
    mockListPlans.mockResolvedValue([
      {
        ...STUB_PLAN,
        lines: [
          { ...base, line_id: "done", product_name: "Agua", qty: "2000.000", delivered_qty: "2000.000" },
          { ...base, line_id: "open", product_name: "Hielo", qty: "4.000", delivered_qty: "1.000" },
        ],
      },
    ]);
    renderTab();
    await screen.findByText("INS20260001");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(screen.getByText("Entrega completa")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Entregar" })).toHaveLength(1);
    expect(screen.getAllByLabelText("Cantidad a entregar")).toHaveLength(1);
  });

  it("shows plan line quantities without trailing zeros", async () => {
    const user = userEvent.setup();
    mockListPlans.mockResolvedValue([STUB_PLAN]);
    renderTab();
    await screen.findByText("INS20260001");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));

    const row = screen.getByText("2026-08-29").closest("tr") as HTMLElement;
    const cells = within(row).getAllByRole("cell");
    expect(cells[3]).toHaveTextContent(/^4$/);
    expect(cells[4]).toHaveTextContent(/^0$/);
    expect(screen.queryByText("4.000")).toBeNull();
    expect(screen.queryByText("0.000")).toBeNull();
  });

  it("shows kitchen report quantities without trailing zeros and keeps real fractions", async () => {
    mockKitchen.mockResolvedValue({
      timezone: "America/Mexico_City",
      date: null,
      rows: [
        {
          date: "2026-08-29",
          slot_label: "Almuerzo",
          deliver_time: "13:00",
          product_name: "Arroz",
          uom: "KG",
          club_name: "Panteras",
          qty: "2.000",
          delivered_qty: "0.000",
          line_total_centavos: 1000,
        },
        {
          date: "2026-08-29",
          slot_label: "Cena",
          deliver_time: "19:00",
          product_name: "Frijol",
          uom: "KG",
          club_name: "Panteras",
          qty: "6.000",
          delivered_qty: "2.500",
          line_total_centavos: 1000,
        },
      ],
    });
    renderTab();

    const rice = (await screen.findByText("Arroz")).closest("tr") as HTMLElement;
    const beans = screen.getByText("Frijol").closest("tr") as HTMLElement;
    expect(within(rice).getAllByRole("cell")[4]).toHaveTextContent(/^2$/);
    expect(within(rice).getAllByRole("cell")[5]).toHaveTextContent(/^0$/);
    expect(within(beans).getAllByRole("cell")[4]).toHaveTextContent(/^6$/);
    expect(within(beans).getAllByRole("cell")[5]).toHaveTextContent(/^2\.5$/);
  });
});
