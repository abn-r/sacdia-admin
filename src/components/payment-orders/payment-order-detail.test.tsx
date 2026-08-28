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

const mockGetPaymentOrder = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockGetProofDownload = vi.fn();
let mockCurrentUserId = "reviewer-1";

vi.mock("@/lib/api/field-payment-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/field-payment-orders")>();
  return {
    ...original,
    getPaymentOrder: (...args: unknown[]) => mockGetPaymentOrder(...args),
    approvePaymentOrder: (...args: unknown[]) => mockApprove(...args),
    rejectPaymentOrder: (...args: unknown[]) => mockReject(...args),
    getPaymentOrderProofDownload: (...args: unknown[]) =>
      mockGetProofDownload(...args),
  };
});

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: mockCurrentUserId, user_id: mockCurrentUserId },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { PaymentOrderDetail } from "@/components/payment-orders/payment-order-detail";

const ORDER_ID = "0f0e0d0c-0b0a-4a4b-8c8d-1a2b3c4d5e6f";

const STUB_ORDER: PaymentOrder = {
  field_payment_order_id: ORDER_ID,
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
  lines: [
    {
      field_payment_order_line_id: "line-1",
      sequence: 1,
      beneficiary_user_id: "ben-1",
      unit_cost_centavos: 20000,
      purpose: "CAMPOREE",
      purpose_ref_id: 3,
      insurance_assignment_id: null,
      camporee_member_id: null,
    },
  ],
  proofs: [
    {
      field_payment_order_proof_id: "proof-1",
      file_name: "comprobante.pdf",
      mime_type: "application/pdf",
      status: "SUBMITTED",
      reject_reason: null,
      uploaded_by_id: "uploader-1",
      reviewed_by_id: null,
      created_at: "2026-08-12T01:00:00.000Z",
    },
  ],
};

function renderDetail() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentOrderDetail
        orderId={ORDER_ID}
        open
        onOpenChange={() => {}}
        onChanged={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

describe("PaymentOrderDetail", () => {
  beforeEach(() => {
    mockGetPaymentOrder.mockReset();
    mockApprove.mockReset();
    mockReject.mockReset();
    mockGetProofDownload.mockReset();
    mockCurrentUserId = "reviewer-1";
    mockGetPaymentOrder.mockResolvedValue(STUB_ORDER);
    mockApprove.mockResolvedValue({ ...STUB_ORDER, status: "APPROVED" });
    mockReject.mockResolvedValue({ ...STUB_ORDER, status: "PROOF_REJECTED" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the order, beneficiary lines, and proof", async () => {
    renderDetail();

    expect(await screen.findByText("OP-2026-0007")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
    expect(screen.queryByText("ben-1")).not.toBeInTheDocument();
    expect(screen.getByText("comprobante.pdf")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Aprobar" }),
    ).not.toBeDisabled();
  });

  it("shows the beneficiary full name from nested users, not the UUID", async () => {
    mockGetPaymentOrder.mockResolvedValue({
      ...STUB_ORDER,
      lines: [
        {
          ...STUB_ORDER.lines![0],
          beneficiary_user_id: "104a2549-2056-4b9b-aaeb-51d8fd43191d",
          users: {
            name: "Ana",
            paternal_last_name: "Pérez",
            maternal_last_name: "López",
          },
        },
      ],
    });
    renderDetail();

    expect(await screen.findByText("Ana Pérez López")).toBeInTheDocument();
    expect(
      screen.queryByText("104a2549-2056-4b9b-aaeb-51d8fd43191d"),
    ).not.toBeInTheDocument();
  });

  it("shows a friendly proof label instead of a generated storage filename", async () => {
    mockGetPaymentOrder.mockResolvedValue({
      ...STUB_ORDER,
      proofs: [
        {
          ...STUB_ORDER.proofs![0],
          file_name:
            "sacdia_report_0bf16955-08e7-4959-bfe8-de3708cf9636_1784749569596.pdf",
          mime_type: "application/pdf",
        },
      ],
    });
    renderDetail();

    expect(await screen.findByText("Comprobante PDF")).toBeInTheDocument();
    expect(
      screen.queryByText(/sacdia_report_/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver comprobante" }),
    ).toBeInTheDocument();
  });

  it("approves a submitted proof", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText("OP-2026-0007");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(ORDER_ID);
    });
  });

  it("blocks approval for the proof uploader (maker-checker)", async () => {
    mockCurrentUserId = "uploader-1";
    renderDetail();
    await screen.findByText("OP-2026-0007");

    expect(screen.getByRole("button", { name: "Aprobar" })).toBeDisabled();
    expect(
      screen.getByText(
        "Tú subiste este comprobante: otra persona debe aprobarlo (maker-checker).",
      ),
    ).toBeInTheDocument();
  });

  it("requires a reason before confirming a rejection", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText("OP-2026-0007");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    const confirm = await screen.findByRole("button", {
      name: "Confirmar rechazo",
    });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText("Motivo del rechazo (obligatorio)"),
      "Monto incorrecto",
    );
    expect(confirm).not.toBeDisabled();
    await user.click(confirm);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(ORDER_ID, "Monto incorrecto");
    });
  });
});
