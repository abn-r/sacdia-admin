import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const mockApproveBatch = vi.fn();
const mockRejectBatch = vi.fn();
const mockApproveItem = vi.fn();
const mockRejectItem = vi.fn();

vi.mock("@/lib/api/certificate-bulk-imports", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certificate-bulk-imports")>();
  return {
    ...original,
    approveCertificateBulkImportBatch: (...args: unknown[]) => mockApproveBatch(...args),
    rejectCertificateBulkImportBatch: (...args: unknown[]) => mockRejectBatch(...args),
    approveCertificateBulkImportItem: (...args: unknown[]) => mockApproveItem(...args),
    rejectCertificateBulkImportItem: (...args: unknown[]) => mockRejectItem(...args),
  };
});

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { CertificateBulkImportActionDialog } from "@/components/certificate-bulk-imports/certificate-bulk-import-action-dialog";

function renderDialog(props: Partial<React.ComponentProps<typeof CertificateBulkImportActionDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificateBulkImportActionDialog
        open
        action="reject"
        scope="batch"
        batchId="batch-1"
        title="Rechazar lote completo"
        description="El miembro podrá corregir el lote."
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        {...props}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenChange, onSuccess };
}

describe("CertificateBulkImportActionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApproveBatch.mockResolvedValue({ status: "APPROVED" });
    mockRejectBatch.mockResolvedValue({ status: "NEEDS_CORRECTION" });
    mockApproveItem.mockResolvedValue({ status: "APPROVED" });
    mockRejectItem.mockResolvedValue({ status: "REJECTED" });
  });

  afterEach(() => cleanup());

  it("requires a rejection reason before calling the API", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /rechazar/i }));

    expect(await screen.findByText(/motivo de rechazo es obligatorio/i)).toBeInTheDocument();
    expect(mockRejectBatch).not.toHaveBeenCalled();
  });

  it("calls batch reject with trimmed reason", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderDialog();

    await user.type(screen.getByLabelText(/motivo de rechazo/i), "  Fecha ilegible  ");
    await user.click(screen.getByRole("button", { name: /rechazar/i }));

    await waitFor(() => {
      expect(mockRejectBatch).toHaveBeenCalledWith("batch-1", { reason: "Fecha ilegible" });
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("calls item approve with optional trimmed comment", async () => {
    const user = userEvent.setup();
    renderDialog({
      action: "approve",
      scope: "item",
      itemId: "item-1",
      title: "Aprobar fila",
      description: "La fila se aplicará al perfil del miembro.",
    });

    await user.type(screen.getByLabelText(/comentario/i), "  Validado contra comprobante  ");
    await user.click(screen.getByRole("button", { name: /aprobar/i }));

    await waitFor(() => {
      expect(mockApproveItem).toHaveBeenCalledWith("batch-1", "item-1", {
        comment: "Validado contra comprobante",
      });
    });
  });
});
