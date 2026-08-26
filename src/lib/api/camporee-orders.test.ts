import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    getClientAuthToken: vi.fn(),
  };
});

import { ApiError, apiRequest, getClientAuthToken } from "@/lib/api/client";
import {
  addCamporeeOrderProductOption,
  approveCamporeeOrder,
  authorizeCamporeeOrderWithoutProof,
  buildCreateCamporeeOrderBody,
  canDeliverToSection,
  canVisualizeDistribution,
  cancelCamporeeOrder,
  createCamporeeOrder,
  createCamporeeOrderProduct,
  createPayloadHasClientAmounts,
  deliverCamporeeOrderLineToMember,
  deliverCamporeeOrderToSection,
  deriveDistributionStatus,
  downloadCamporeeOrderPdf,
  getCamporeeOrder,
  getCamporeeOrderErrorMessage,
  getCamporeeOrderOfferings,
  getCamporeeOrderProduct,
  getCamporeeOrderProofDownload,
  getCamporeeOrdersReviewQueue,
  isExactCatalogOwner,
  listCamporeeOrderProducts,
  listCamporeeOrders,
  rejectCamporeeOrder,
  replaceCamporeeOrderOfferings,
  summarizeNamedLines,
  updateCamporeeOrderProduct,
  updateCamporeeOrderProductOption,
  updateCamporeeOrderSettings,
  uploadCamporeeOrderProof,
  type CamporeeOrder,
} from "./camporee-orders";

const mockApiRequest = vi.mocked(apiRequest);
const mockGetClientAuthToken = vi.mocked(getClientAuthToken);

function stubOrder(
  overrides: Partial<CamporeeOrder> = {},
): CamporeeOrder {
  return {
    camporee_order_id: "order-1",
    local_field_id: 7,
    club_id: 5,
    club_section_id: 11,
    local_camporee_id: 40,
    union_camporee_id: null,
    folio: 1,
    folio_reference: "PED20260001",
    status: "ISSUED",
    currency: "MXN",
    total_centavos: 19900,
    expires_at: "2026-09-08T00:00:00.000Z",
    issued_by_id: "user-1",
    approved_by_id: null,
    approved_at: null,
    authorized_without_proof: false,
    authorized_by_id: null,
    authorized_at: null,
    authorization_reason: null,
    delivered_to_section_by_id: null,
    delivered_to_section_at: null,
    bank_name: "Banco Norte",
    bank_account: "123",
    bank_clabe: null,
    bank_holder: "Asociación",
    cash_instructions: null,
    extra_notes: null,
    created_at: "2026-08-24T00:00:00.000Z",
    modified_at: "2026-08-24T00:00:00.000Z",
    lines: [
      {
        camporee_order_line_id: "line-1",
        sequence: 1,
        camporee_member_id: 801,
        beneficiary_user_id: "member-1",
        beneficiary_name_snapshot: "Ana Ruiz",
        offering_id: "off-1",
        product_id: "prod-1",
        option_id: "opt-m",
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
    ...overrides,
  };
}

describe("camporee-orders API client", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockGetClientAuthToken.mockReset();
  });

  it("lists orders with camporee filters and unwraps the envelope", async () => {
    const orders = [
      stubOrder(),
      stubOrder({
        camporee_order_id: "order-2",
        folio: 2,
        folio_reference: "PED20260002",
        status: "PROOF_SUBMITTED",
      }),
    ];
    mockApiRequest.mockResolvedValue({ status: "success", data: orders });

    const result = await listCamporeeOrders({
      camporee_id: 40,
      status: "ISSUED",
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/camporee-orders", {
      params: { camporee_id: "40", status: "ISSUED" },
    });
    expect(result).toHaveLength(2);
    expect(result.map((order) => order.folio_reference)).toEqual([
      "PED20260001",
      "PED20260002",
    ]);
  });

  it("does not merge two independent folios from the same section", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [
        stubOrder({ camporee_order_id: "a", folio_reference: "PED20260001" }),
        stubOrder({ camporee_order_id: "b", folio_reference: "PED20260002" }),
      ],
    });

    const result = await listCamporeeOrders({ camporee_id: 40 });

    expect(new Set(result.map((order) => order.camporee_order_id)).size).toBe(2);
    expect(result[0]?.folio_reference).not.toBe(result[1]?.folio_reference);
  });

  it("loads the review queue without collapsing statuses", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [stubOrder({ status: "PROOF_SUBMITTED" })],
    });

    const result = await getCamporeeOrdersReviewQueue();

    expect(mockApiRequest).toHaveBeenCalledWith("/camporee-orders/review-queue");
    expect(result[0]?.status).toBe("PROOF_SUBMITTED");
  });

  it("unwraps order detail statuses used by admin review", async () => {
    for (const status of [
      "ISSUED",
      "PROOF_SUBMITTED",
      "PROOF_REJECTED",
      "PAID",
      "DELIVERED",
      "CANCELLED",
      "EXPIRED",
    ] as const) {
      mockApiRequest.mockResolvedValueOnce({
        status: "success",
        data: stubOrder({ status, authorized_without_proof: status === "PAID" }),
      });
      const order = await getCamporeeOrder("order-1");
      expect(order.status).toBe(status);
    }
  });

  it("create payload never sends client amounts", async () => {
    const body = buildCreateCamporeeOrderBody([
      {
        camporee_member_id: 801,
        offering_id: "off-1",
        option_id: "opt-m",
        qty: 2,
      },
    ]);

    expect(body).toEqual({
      lines: [
        {
          camporee_member_id: 801,
          offering_id: "off-1",
          option_id: "opt-m",
          qty: 2,
        },
      ],
    });
    expect(createPayloadHasClientAmounts(body)).toBe(false);

    mockApiRequest.mockResolvedValue({
      status: "success",
      data: stubOrder(),
    });

    await createCamporeeOrder(40, "local", [
      { camporee_member_id: 801, offering_id: "off-1", qty: 1 },
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith("/camporees/40/orders", {
      method: "POST",
      body: {
        lines: [{ camporee_member_id: 801, offering_id: "off-1", qty: 1 }],
      },
      headers: undefined,
    });
    const posted = mockApiRequest.mock.calls[0]?.[1]?.body as {
      lines: Array<Record<string, unknown>>;
    };
    expect(posted.lines[0]).not.toHaveProperty("unit_price_centavos");
    expect(posted.lines[0]).not.toHaveProperty("line_total_centavos");
    expect(posted.lines[0]).not.toHaveProperty("total_centavos");
    expect(posted.lines[0]).not.toHaveProperty("price_centavos");
  });

  it("posts review actions and requires a reason for exception and reject", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: stubOrder() });

    await approveCamporeeOrder("order-1");
    await rejectCamporeeOrder("order-1", "Comprobante ilegible");
    await authorizeCamporeeOrderWithoutProof("order-1", "Pagó en caja");
    await deliverCamporeeOrderToSection("order-1");
    await cancelCamporeeOrder("order-1");
    await deliverCamporeeOrderLineToMember("order-1", "line-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/camporee-orders/order-1/approve",
      { method: "POST" },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/camporee-orders/order-1/reject",
      { method: "POST", body: { reason: "Comprobante ilegible" } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/camporee-orders/order-1/authorize-without-proof",
      { method: "POST", body: { reason: "Pagó en caja" } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/camporee-orders/order-1/deliver",
      { method: "POST" },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      5,
      "/camporee-orders/order-1/cancel",
      { method: "POST", body: {} },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      6,
      "/camporee-orders/order-1/lines/line-1/deliver-to-member",
      { method: "POST" },
    );
  });

  it("downloads the PDF as a blob and loads a signed proof URL", async () => {
    mockGetClientAuthToken.mockResolvedValue("token-1");
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = await downloadCamporeeOrderPdf("order-1");
    expect(file).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/camporee-orders/order-1/document"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/pdf",
          Authorization: "Bearer token-1",
        }),
      }),
    );

    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        url: "https://signed.example/proof.pdf",
        expires_in: 900,
        file_name: "comprobante.pdf",
        mime_type: "application/pdf",
        status: "SUBMITTED",
        uploaded_by_id: "user-1",
        created_at: "2026-08-24T00:00:00.000Z",
      },
    });
    const proof = await getCamporeeOrderProofDownload("order-1");
    expect(mockApiRequest).toHaveBeenCalledWith("/camporee-orders/order-1/proof");
    expect(proof.expires_in).toBe(900);

    vi.unstubAllGlobals();
  });

  it("uploads proof as multipart field file", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { proof: { camporee_order_proof_id: "p1" }, order: stubOrder() },
    });
    const file = new Blob(["x"], { type: "application/pdf" });

    await uploadCamporeeOrderProof("order-1", file);

    const call = mockApiRequest.mock.calls[0];
    expect(call?.[0]).toBe("/camporee-orders/order-1/proof");
    expect(call?.[1]?.method).toBe("POST");
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("hits catalog, settings and offerings endpoints without inventing routes", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [] });
    await listCamporeeOrderProducts({ active: true });
    await getCamporeeOrderProduct("prod-1");
    await createCamporeeOrderProduct({
      title: "Playera",
      size_scheme: "LETTER",
    });
    await updateCamporeeOrderProduct("prod-1", { active: false });
    await addCamporeeOrderProductOption("prod-1", { label: "M" });
    await updateCamporeeOrderProductOption("opt-1", { active: false });
    await updateCamporeeOrderSettings(40, "local", { orders_enabled: true });
    await updateCamporeeOrderSettings(9, "union", { orders_enabled: false });
    await getCamporeeOrderOfferings(40, "local");
    await replaceCamporeeOrderOfferings(9, "union", [
      { product_id: "prod-1", price_centavos: 15000 },
    ]);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/camporee-order-products", {
      params: { active: true },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/camporee-order-products/prod-1",
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/camporee-order-products", {
      method: "POST",
      body: { title: "Playera", size_scheme: "LETTER" },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/camporee-order-products/prod-1",
      { method: "PATCH", body: { active: false } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      5,
      "/camporee-order-products/prod-1/options",
      { method: "POST", body: { label: "M" } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      6,
      "/camporee-order-product-options/opt-1",
      { method: "PATCH", body: { active: false } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      7,
      "/camporees/40/orders-settings",
      { method: "PATCH", body: { orders_enabled: true } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      8,
      "/union-camporees/9/orders-settings",
      { method: "PATCH", body: { orders_enabled: false } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      9,
      "/camporees/40/order-offerings",
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      10,
      "/union-camporees/9/order-offerings",
      {
        method: "PUT",
        body: { items: [{ product_id: "prod-1", price_centavos: 15000 }] },
      },
    );
  });

  it("maps CAMPOREE_ORDER_* codes like field-payment-orders", () => {
    const error = new ApiError("raw", 403, {
      code: "CAMPOREE_ORDER_MAKER_CHECKER",
    });
    expect(getCamporeeOrderErrorMessage(error)).toContain("comprobante");
    expect(
      getCamporeeOrderErrorMessage(
        new ApiError("raw", 400, {
          code: "CAMPOREE_ORDER_AUTHORIZATION_REASON_REQUIRED",
        }),
      ),
    ).toContain("motivo");
  });
});

describe("camporee-orders derived helpers", () => {
  it("derives distribution_status from named lines", () => {
    expect(deriveDistributionStatus([])).toBe("NOT_STARTED");
    expect(
      deriveDistributionStatus([{ delivered_to_member_at: null }]),
    ).toBe("NOT_STARTED");
    expect(
      deriveDistributionStatus([
        { delivered_to_member_at: "2026-08-24T00:00:00.000Z" },
        { delivered_to_member_at: null },
      ]),
    ).toBe("PARTIAL");
    expect(
      deriveDistributionStatus([
        { delivered_to_member_at: "2026-08-24T00:00:00.000Z" },
        { delivered_to_member_at: "2026-08-25T00:00:00.000Z" },
      ]),
    ).toBe("COMPLETE");
  });

  it("summarizes named lines without inventing a persisted aggregate", () => {
    expect(
      summarizeNamedLines([
        {
          product_title_snapshot: "Playera",
          option_label_snapshot: "M",
          qty: 1,
          line_total_centavos: 10000,
        },
        {
          product_title_snapshot: "Playera",
          option_label_snapshot: "M",
          qty: 2,
          line_total_centavos: 20000,
        },
        {
          product_title_snapshot: "Gorra",
          option_label_snapshot: null,
          qty: 1,
          line_total_centavos: 5000,
        },
      ]),
    ).toEqual([
      {
        product_title_snapshot: "Playera",
        option_label_snapshot: "M",
        qty: 3,
        subtotal_centavos: 30000,
      },
      {
        product_title_snapshot: "Gorra",
        option_label_snapshot: null,
        qty: 1,
        subtotal_centavos: 5000,
      },
    ]);
  });

  it("restricts LF deliver to PAID and distribution visualization to DELIVERED", () => {
    expect(canDeliverToSection("PAID")).toBe(true);
    expect(canDeliverToSection("PROOF_SUBMITTED")).toBe(false);
    expect(canVisualizeDistribution("DELIVERED")).toBe(true);
    expect(canVisualizeDistribution("PAID")).toBe(false);
  });

  it("treats catalog ancestors as read-only except exact owner or all", () => {
    const unionProduct = {
      owner_scope: "UNION" as const,
      owner_division_id: 1,
      owner_union_id: 8,
      owner_local_field_id: null,
    };
    expect(
      isExactCatalogOwner(unionProduct, { level: "union", unionId: 8 }),
    ).toBe(true);
    expect(
      isExactCatalogOwner(unionProduct, {
        level: "local_field",
        localFieldId: 7,
        unionId: 8,
      }),
    ).toBe(false);
    expect(isExactCatalogOwner(unionProduct, { level: "all" })).toBe(true);
  });
});
