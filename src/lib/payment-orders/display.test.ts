import { describe, expect, it } from "vitest";
import type { PaymentOrder, PaymentOrderLine } from "@/lib/api/field-payment-orders";
import {
  attachPaymentOrderBeneficiaries,
  getPaymentOrderLineBeneficiary,
  getProofDisplayLabel,
  isMachineProofFileName,
} from "@/lib/payment-orders/display";

const LABELS = {
  pdf: "Comprobante PDF",
  jpeg: "Comprobante JPEG",
  png: "Comprobante PNG",
  generic: "Comprobante",
};

function line(
  overrides: Partial<PaymentOrderLine> & Record<string, unknown> = {},
): PaymentOrderLine {
  return {
    field_payment_order_line_id: "line-1",
    sequence: 1,
    beneficiary_user_id: "104a2549-2056-4b9b-aaeb-51d8fd43191d",
    unit_cost_centavos: 20000,
    purpose: "CAMPOREE",
    purpose_ref_id: 3,
    insurance_assignment_id: null,
    camporee_member_id: null,
    ...overrides,
  };
}

function order(lines: PaymentOrderLine[]): PaymentOrder {
  return {
    field_payment_order_id: "order-1",
    purpose: "CAMPOREE",
    local_field_id: 1,
    club_id: 10,
    club_section_id: 20,
    folio: 7,
    folio_reference: "OP-2026-0007",
    insurance_cycle_config_id: null,
    local_camporee_id: 3,
    union_camporee_id: null,
    currency: "MXN",
    unit_cost_centavos: 20000,
    total_centavos: 20000,
    status: "PROOF_SUBMITTED",
    expires_at: "2026-08-27T00:00:00.000Z",
    issued_by_id: "issuer-1",
    approved_by_id: null,
    cancelled_by_id: null,
    created_at: "2026-08-12T00:00:00.000Z",
    lines,
    proofs: [],
  };
}

describe("getPaymentOrderLineBeneficiary", () => {
  it("does not use a bare UUID as the display name", () => {
    const result = getPaymentOrderLineBeneficiary(line());
    expect(result.full_name).toBeNull();
    expect(result.user_id).toBe("104a2549-2056-4b9b-aaeb-51d8fd43191d");
  });

  it("reads nested Prisma users.* name parts", () => {
    const result = getPaymentOrderLineBeneficiary(
      line({
        users: {
          name: "Ana",
          paternal_last_name: "Pérez",
          maternal_last_name: "López",
          user_image: "https://cdn.example/ana.jpg",
        },
      }),
    );
    expect(result.full_name).toBe("Ana Pérez López");
    expect(result.picture_url).toBe("https://cdn.example/ana.jpg");
  });

  it("reads a flat full_name", () => {
    const result = getPaymentOrderLineBeneficiary(
      line({ full_name: "Carlos Ruiz" }),
    );
    expect(result.full_name).toBe("Carlos Ruiz");
  });

  it("reads nested member identity", () => {
    const result = getPaymentOrderLineBeneficiary(
      line({
        member: { full_name: "María Gómez", email: "maria@example.com" },
      }),
    );
    expect(result.full_name).toBe("María Gómez");
    expect(result.email).toBe("maria@example.com");
  });
});

describe("proof display label", () => {
  it("treats sacdia_report storage keys as machine names", () => {
    expect(
      isMachineProofFileName(
        "sacdia_report_0bf16955-08e7-4959-bfe8-de3708cf9636_1784749569596.pdf",
      ),
    ).toBe(true);
  });

  it("keeps a human original filename", () => {
    expect(isMachineProofFileName("recibo-banco.pdf")).toBe(false);
    expect(
      getProofDisplayLabel({ file_name: "recibo-banco.pdf" }, LABELS),
    ).toBe("recibo-banco.pdf");
  });

  it("falls back to a typed comprobante label for generated keys", () => {
    expect(
      getProofDisplayLabel(
        {
          file_name:
            "sacdia_report_0bf16955-08e7-4959-bfe8-de3708cf9636_1784749569596.pdf",
          mime_type: "application/pdf",
        },
        LABELS,
      ),
    ).toBe("Comprobante PDF");
  });

  it("prefers original_file_name when it is human", () => {
    expect(
      getProofDisplayLabel(
        {
          file_name: "field-payment-orders/lf-1/order-1/abc.pdf",
          original_file_name: "Comprobante transferencia.pdf",
          mime_type: "application/pdf",
        },
        LABELS,
      ),
    ).toBe("Comprobante transferencia.pdf");
  });
});

describe("attachPaymentOrderBeneficiaries", () => {
  it("fills missing names from the section roster", async () => {
    const userId = "104a2549-2056-4b9b-aaeb-51d8fd43191d";
    const result = await attachPaymentOrderBeneficiaries(order([line()]), async () => [
      {
        user_id: userId,
        name: "Juan Pérez",
        picture_url: "https://cdn.example/juan.jpg",
      },
    ]);

    expect(result.lines?.[0]?.beneficiary?.full_name).toBe("Juan Pérez");
    expect(result.lines?.[0]?.beneficiary?.picture_url).toBe(
      "https://cdn.example/juan.jpg",
    );
  });

  it("does not call the roster when payload already has names", async () => {
    let called = false;
    await attachPaymentOrderBeneficiaries(
      order([line({ full_name: "Ana Pérez" })]),
      async () => {
        called = true;
        return [];
      },
    );
    expect(called).toBe(false);
  });
});
