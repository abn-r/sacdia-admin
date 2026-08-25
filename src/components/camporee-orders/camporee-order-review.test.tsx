import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { CamporeeOrder } from "@/lib/types/camporee-orders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetReviewQueue = vi.fn();
const mockGetCamporeeOrder = vi.fn();
const mockApprove = vi.fn();
const mockAuthorize = vi.fn();
const mockReject = vi.fn();

vi.mock("@/lib/api/camporee-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/camporee-orders")>();
  return {
    ...original,
    getCamporeeOrdersReviewQueue: (...args: unknown[]) =>
      mockGetReviewQueue(...args),
    getCamporeeOrder: (...args: unknown[]) => mockGetCamporeeOrder(...args),
    approveCamporeeOrder: (...args: unknown[]) => mockApprove(...args),
    authorizeCamporeeOrderWithoutProof: (...args: unknown[]) =>
      mockAuthorize(...args),
    rejectCamporeeOrder: (...args: unknown[]) => mockReject(...args),
  };
});

const mockHasPermission = vi.fn();

vi.mock("@/lib/auth/permission-utils", () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "reviewer-1", user_id: "reviewer-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CamporeeOrderReviewTray } from "@/components/camporee-orders/camporee-order-review-tray";

const ORDER_ID = "order-review-1";

const STUB_ORDER: CamporeeOrder = {
  camporee_order_id: ORDER_ID,
  local_field_id: 1,
  club_id: 10,
  club_section_id: 20,
  local_camporee_id: 3,
  union_camporee_id: null,
  folio: 2,
  folio_reference: "PED20260002",
  status: "PROOF_SUBMITTED",
  currency: "MXN",
  total_centavos: 19900,
  expires_at: "2026-08-27T00:00:00.000Z",
  issued_by_id: "issuer-1",
  approved_by_id: null,
  approved_at: null,
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
  lines: [],
  summary: [],
  distribution_status: "NOT_STARTED",
};

function renderTray() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeOrderReviewTray />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeOrderReviewTray", () => {
  beforeEach(() => {
    mockGetReviewQueue.mockReset();
    mockGetCamporeeOrder.mockReset();
    mockApprove.mockReset();
    mockAuthorize.mockReset();
    mockReject.mockReset();
    mockHasPermission.mockReset();
    mockGetReviewQueue.mockResolvedValue([STUB_ORDER]);
    mockGetCamporeeOrder.mockResolvedValue(STUB_ORDER);
    mockApprove.mockResolvedValue({ ...STUB_ORDER, status: "PAID" });
    mockAuthorize.mockResolvedValue({
      ...STUB_ORDER,
      status: "PAID",
      authorized_without_proof: true,
    });
    mockHasPermission.mockImplementation((_user, permission: string) => {
      if (permission === "camporee-orders:review") return true;
      if (permission === "camporee-orders:authorize-without-proof") return true;
      if (permission === "camporee-orders:deliver") return false;
      return false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("approves from the primary action", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("PED20260002");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    await screen.findByText("Detalle del pedido");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(ORDER_ID);
    });
    expect(mockAuthorize).not.toHaveBeenCalled();
  });

  it("requires reason for authorize-without-proof secondary action", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("PED20260002");

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    await screen.findByText("Detalle del pedido");

    await user.click(
      screen.getByRole("button", { name: "Autorizar sin comprobante" }),
    );

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Confirmar autorización",
    });
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByPlaceholderText("Motivo de la autorización (obligatorio)"),
      "Pago en caja verificado",
    );
    expect(confirm).not.toBeDisabled();

    await user.click(confirm);

    await waitFor(() => {
      expect(mockAuthorize).toHaveBeenCalledWith(
        ORDER_ID,
        "Pago en caja verificado",
      );
    });
    expect(mockApprove).not.toHaveBeenCalled();
  });
});
