import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { PaymentOrder } from "@/lib/api/field-payment-orders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let mockTab: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockTab ? `tab=${mockTab}` : ""),
  usePathname: () => "/dashboard/payment-orders",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const mockList = vi.fn();
const mockQueue = vi.fn();
const mockGet = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockProof = vi.fn();
const mockReassignments = vi.fn();
let mockUserId = "reviewer-1";

vi.mock("@/lib/api/field-payment-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/field-payment-orders")>();
  return {
    ...original,
    listPaymentOrders: (...a: unknown[]) => mockList(...a),
    getPaymentOrdersReviewQueue: (...a: unknown[]) => mockQueue(...a),
    getPaymentOrder: (...a: unknown[]) => mockGet(...a),
    approvePaymentOrder: (...a: unknown[]) => mockApprove(...a),
    rejectPaymentOrder: (...a: unknown[]) => mockReject(...a),
    getPaymentOrderProofDownload: (...a: unknown[]) => mockProof(...a),
    listReassignments: (...a: unknown[]) => mockReassignments(...a),
  };
});
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: mockUserId, user_id: mockUserId } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { PaymentOrdersClient } from "@/components/payment-orders/payment-orders-client";

function makeOrder(
  id: string,
  status: PaymentOrder["status"],
  extra: Partial<PaymentOrder> = {},
): PaymentOrder {
  return {
    field_payment_order_id: id,
    purpose: "INSURANCE",
    local_field_id: 1,
    club_id: 10,
    club_section_id: 20,
    folio: 1,
    folio_reference: `ORD-${id}`,
    insurance_cycle_config_id: 5,
    local_camporee_id: null,
    union_camporee_id: null,
    currency: "MXN",
    unit_cost_centavos: 15000,
    total_centavos: 90000,
    status,
    expires_at: "2027-01-01T00:00:00.000Z",
    issued_by_id: "issuer-1",
    approved_by_id: null,
    cancelled_by_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    club_name: "Club Orión",
    lines: [
      {
        field_payment_order_line_id: `${id}-l1`,
        sequence: 1,
        beneficiary_user_id: "u1",
        beneficiary_name: "Sofía Mendoza",
        unit_cost_centavos: 15000,
        purpose: "INSURANCE",
        purpose_ref_id: 5,
        insurance_assignment_id: null,
        camporee_member_id: null,
      },
    ],
    proofs: [
      {
        field_payment_order_proof_id: `${id}-p`,
        file_name: "transferencia.jpg",
        mime_type: "image/jpeg",
        status: "SUBMITTED",
        reject_reason: null,
        uploaded_by_id: "club-director",
        reviewed_by_id: null,
        created_at: "2026-11-20T00:00:00.000Z",
      },
    ],
    ...extra,
  };
}

const REVIEW = makeOrder("rev", "PROOF_SUBMITTED");
const WAITING = makeOrder("wait", "ISSUED", { proofs: [] });
const REJECTED = makeOrder("rej", "PROOF_REJECTED");
const ALL = [REVIEW, WAITING, REJECTED];

function renderClient(
  tabs = { orders: true, reassignments: true },
  initialOrderId: string | null = null,
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentOrdersClient tabs={tabs} initialOrderId={initialOrderId} />
    </NextIntlClientProvider>,
  );
}

describe("PaymentOrdersClient", () => {
  beforeEach(() => {
    mockTab = null;
    mockUserId = "reviewer-1";
    mockList.mockReset().mockResolvedValue(ALL);
    mockQueue.mockReset().mockResolvedValue([REVIEW]);
    mockGet.mockReset().mockResolvedValue(REVIEW);
    mockApprove.mockReset().mockResolvedValue(REVIEW);
    mockReject.mockReset().mockResolvedValue(REVIEW);
    mockProof.mockReset().mockResolvedValue({
      url: "https://files.test/voucher.jpg",
      expires_in: 60,
      file_name: "transferencia.jpg",
      mime_type: "image/jpeg",
      status: "SUBMITTED",
      uploaded_by_id: "club-director",
      created_at: "2026-11-20T00:00:00.000Z",
    });
    mockReassignments.mockReset().mockResolvedValue([]);
  });
  afterEach(() => cleanup());

  it("opens on Por revisar with counts and only orders under review", async () => {
    renderClient();
    expect((await screen.findAllByText("ORD-rev")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("ORD-wait")).toHaveLength(0);
    expect(screen.getByRole("tab", { name: /Por revisar/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Esperan pago/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Rechazadas/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Reasignaciones" })).toBeInTheDocument();
    expect(screen.queryByText(/Pagos pendientes/)).not.toBeInTheDocument();
    expect(screen.getByText(/1 comprobante espera revisión/)).toBeInTheDocument();
  });

  it("shows an error, not an empty list, when loading fails", async () => {
    mockList.mockRejectedValue(new ApiError("boom", 500, null));
    mockQueue.mockRejectedValue(new ApiError("boom", 500, null));
    renderClient();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Nada por revisar")).not.toBeInTheDocument();
  });

  it("opens the same review sheet and asks to confirm the amount before approving", async () => {
    const user = userEvent.setup();
    renderClient();
    await user.click(await screen.findByRole("button", { name: "Revisar" }));

    expect(await screen.findByTestId("order-total")).toHaveTextContent("$900.00");
    expect(await screen.findByAltText("transferencia.jpg")).toBeInTheDocument();
    expect(screen.getByText("Sofía Mendoza")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aprobar pago" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Aprobar el pago de $900.00?")).toBeInTheDocument();
    expect(mockApprove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar aprobación" }));
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("rev"));
  });

  it("rejects inside the sheet with a required reason", async () => {
    const user = userEvent.setup();
    renderClient();
    await user.click(await screen.findByRole("button", { name: "Revisar" }));
    await user.click(await screen.findByRole("button", { name: "Rechazar…" }));

    expect(screen.getByText(/mismo folio/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));
    expect(mockReject).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Motivo del rechazo"), "Monto incorrecto");
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));
    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith("rev", "Monto incorrecto"),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("explains in plain Spanish why the uploader cannot approve", async () => {
    mockUserId = "club-director";
    const user = userEvent.setup();
    renderClient();
    await user.click(await screen.findByRole("button", { name: "Revisar" }));

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Tú subiste este comprobante");
    expect(note).not.toHaveTextContent(/maker/i);
    expect(screen.getByRole("button", { name: "Aprobar pago" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar…" })).toBeEnabled();
  });

  it("opens the order from the deep link", async () => {
    renderClient(undefined, "rev");
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("rev"));
    expect(await screen.findByTestId("order-total")).toBeInTheDocument();
  });

  it("shows reassignments as history only, without approve or reject buttons", async () => {
    mockTab = "reassignments";
    mockReassignments.mockResolvedValue([
      {
        insurance_reassignment_request_id: 1,
        insurance_assignment_id: 1,
        from_user_id: "a",
        to_user_id: "b",
        reason: "Cambio de sección",
        status: "PENDING",
        reject_reason: null,
        requested_by_id: "c",
        reviewed_by_id: null,
        from_user_name: "Iker Lozano",
        to_user_name: "Mía Herrera",
        requested_by_name: "Paola Núñez",
        reviewed_by_name: null,
        created_at: "2026-11-12T00:00:00.000Z",
      },
    ]);
    renderClient();
    expect(await screen.findByText("Mía Herrera")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
    expect(screen.getByText(/sin aprobación del Campo/)).toBeInTheDocument();
  });

  it("shows an error when the reassignment history fails to load", async () => {
    mockTab = "reassignments";
    mockReassignments.mockRejectedValue(new ApiError("boom", 500, null));
    renderClient();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No hay solicitudes de reasignación")).not.toBeInTheDocument();
  });
});
