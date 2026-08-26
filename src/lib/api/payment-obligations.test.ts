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
  listPendingPaymentObligations,
  paymentObligationActionOwner,
  paymentObligationDetailPath,
  type PaymentObligation,
} from "./payment-obligations";

const mockApiRequest = vi.mocked(apiRequest);

function stubObligation(
  overrides: Partial<PaymentObligation> = {},
): PaymentObligation {
  return {
    source: "CAMPOREE_ORDER",
    source_id: "co-1",
    purpose: "CAMPOREE_MATERIALS",
    folio: "PED20260001",
    total_centavos: 19900,
    currency: "MXN",
    status: "PAYMENT_DUE",
    action_required: "UPLOAD_PROOF",
    camporee: { type: "local", id: 40, name: "Camporee Norte" },
    created_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("payment-obligations API client", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("lists pending obligations and unwraps the envelope", async () => {
    const rows = [
      stubObligation(),
      stubObligation({
        source: "FIELD_PAYMENT_ORDER",
        source_id: "fpo-1",
        purpose: "CAMPOREE",
        folio: "ORD20260009",
      }),
      stubObligation({
        source: "MATERIAL_ORDER",
        source_id: "mat-9",
        purpose: "MATERIALS",
        folio: "MAT0001",
        status: "ORDER_REVIEW",
        action_required: "WAIT_APPROVAL",
        camporee: null,
      }),
    ];
    mockApiRequest.mockResolvedValue({ status: "success", data: rows });

    const result = await listPendingPaymentObligations({ camporee_id: 40 });

    expect(mockApiRequest).toHaveBeenCalledWith("/payment-obligations/pending", {
      params: { camporee_id: "40" },
    });
    expect(result.map((row) => row.source)).toEqual([
      "CAMPOREE_ORDER",
      "FIELD_PAYMENT_ORDER",
      "MATERIAL_ORDER",
    ]);
  });

  it("filters union camporee without combining with camporee_id", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [] });

    await listPendingPaymentObligations({ union_camporee_id: 88 });

    expect(mockApiRequest).toHaveBeenCalledWith("/payment-obligations/pending", {
      params: { union_camporee_id: "88" },
    });
  });

  it("keeps two camporee order folios as separate rows", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [
        stubObligation({ source_id: "co-1", folio: "PED20260001" }),
        stubObligation({
          source_id: "co-2",
          folio: "PED20260002",
          status: "UNDER_REVIEW",
          action_required: "WAIT_REVIEW",
        }),
      ],
    });

    const result = await listPendingPaymentObligations();

    expect(result).toHaveLength(2);
    expect(result[0]?.folio).not.toBe(result[1]?.folio);
    expect(paymentObligationDetailPath(result[0]!)).not.toBe(
      paymentObligationDetailPath(result[1]!),
    );
  });
});

describe("payment obligation navigation", () => {
  it("routes each source to its owning admin surface", () => {
    expect(
      paymentObligationDetailPath({
        source: "FIELD_PAYMENT_ORDER",
        source_id: "fpo-1",
      }),
    ).toBe("/dashboard/payment-orders?orderId=fpo-1");
    expect(
      paymentObligationDetailPath({
        source: "MATERIAL_ORDER",
        source_id: "mat-9",
      }),
    ).toBe("/dashboard/materials/request/mat-9");
    expect(
      paymentObligationDetailPath({
        source: "CAMPOREE_ORDER",
        source_id: "co-3",
      }),
    ).toBe("/dashboard/campamentos/pedidos/bandeja?orderId=co-3");
  });

  it("does not mix mutation owners across sources", () => {
    expect(paymentObligationActionOwner("FIELD_PAYMENT_ORDER")).toBe(
      "inscription",
    );
    expect(paymentObligationActionOwner("MATERIAL_ORDER")).toBe("materials");
    expect(paymentObligationActionOwner("CAMPOREE_ORDER")).toBe(
      "camporee-order",
    );
  });
});
