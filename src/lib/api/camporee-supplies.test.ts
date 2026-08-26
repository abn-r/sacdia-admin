import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from "@/lib/api/client";
import {
  createCamporeeSupplyProduct,
  getCamporeeSupplyCatalog,
  listCamporeeSupplyPlans,
  markCamporeeSupplyPaymentPaid,
  updateCamporeeSupplyProduct,
  updateCamporeeSupplySlot,
} from "@/lib/api/camporee-supplies";

describe("camporee-supplies api", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("loads the catalog under the camporee path", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: "success",
      data: {
        supply_edit_cutoff_local_time: "21:00",
        timezone: "America/Mexico_City",
        start_date: "2026-08-28",
        end_date: "2026-08-30",
        slots: [],
        products: [],
      },
    });

    const catalog = await getCamporeeSupplyCatalog(3, "local");
    expect(apiRequest).toHaveBeenCalledWith("/camporees/3/supply-catalog");
    expect(catalog.supply_edit_cutoff_local_time).toBe("21:00");
  });

  it("posts products and lists plans without using PED folios", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        status: "success",
        data: {
          product_id: "p1",
          name: "Hielo",
          uom: "BAG",
          unit_cost_centavos: 1500,
          active: true,
        },
      })
      .mockResolvedValueOnce({
        status: "success",
        data: [
          {
            plan_id: "plan-1",
            payments: [
              {
                folio_reference: "INS20260001",
                kind: "PRINCIPAL",
                total_centavos: 80000,
                status: "ISSUED",
              },
            ],
          },
        ],
      });

    const product = await createCamporeeSupplyProduct(3, "union", {
      name: "Hielo",
      uom: "BAG",
      unit_cost_centavos: 1500,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/union-camporees/3/supply-products",
      expect.objectContaining({ method: "POST" }),
    );
    expect(product.uom).toBe("BAG");

    const plans = await listCamporeeSupplyPlans(3, "union");
    expect(plans[0]?.payments[0]?.folio_reference).toMatch(/^INS/);
  });

  it("marks a supply folio paid on its own endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: "success",
      data: {
        payment_id: "pay-1",
        kind: "PRINCIPAL",
        folio_reference: "INS20260001",
        total_centavos: 80000,
        status: "PAID",
      },
    });
    const paid = await markCamporeeSupplyPaymentPaid("pay-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/camporee-supply-payments/pay-1/mark-paid",
      { method: "POST" },
    );
    expect(paid.status).toBe("PAID");
  });

  it("patches slots and products under the camporee path", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        status: "success",
        data: {
          slot_id: "s1",
          label: "Cena",
          deliver_time: "19:00",
          sort_order: 2,
          active: false,
        },
      })
      .mockResolvedValueOnce({
        status: "success",
        data: {
          product_id: "p1",
          name: "Hielo",
          uom: "BAG",
          unit_cost_centavos: 1500,
          active: false,
        },
      });

    await updateCamporeeSupplySlot(3, "local", "s1", { active: false });
    expect(apiRequest).toHaveBeenCalledWith("/camporees/3/supply-slots/s1", {
      method: "PATCH",
      body: { active: false },
    });

    await updateCamporeeSupplyProduct(3, "local", "p1", { active: false });
    expect(apiRequest).toHaveBeenCalledWith("/camporees/3/supply-products/p1", {
      method: "PATCH",
      body: { active: false },
    });
  });
});
