import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

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

  it("confirms accreditation on the current enrollment", async () => {
    const user = userEvent.setup();
    renderDialog({
      action: "approve",
      scope: "item",
      itemId: "item-1",
      title: "Aprobar fila",
      description: "La fila se aplicará al perfil del miembro.",
      reconciliation: {
        enrollment_id: 40,
        ecclesiastical_year_id: 2014,
        enrollment_date: "2014-02-01T00:00:00.000Z",
        investiture_status: "IN_PROGRESS",
        modified_at: "2014-02-01T00:00:00.000Z",
        record_kind: "OPERATIONAL",
      },
    });

    expect(
      screen.getByText(/inscripción vigente/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /acreditar sobre esta inscripción/i }),
    );

    await waitFor(() => {
      expect(mockApproveItem).toHaveBeenCalledWith("batch-1", "item-1", {
        comment: undefined,
        reconcile_enrollment_id: 40,
        expected_modified_at: "2014-02-01T00:00:00.000Z",
      });
    });
  });
  it("shows the pending-authorization error as an inline banner, not as a toast", async () => {
    const user = userEvent.setup();
    mockApproveItem.mockRejectedValue(
      new ApiError("texto del backend", 409, { code: "CERTIFICATE_IMPORT_AUTHORIZATION_PENDING" }),
    );
    const { onSuccess } = renderDialog({
      action: "approve",
      scope: "item",
      itemId: "item-1",
      title: "Aprobar fila",
      description: "La fila se aplicará al perfil del miembro.",
    });

    await user.click(screen.getByRole("button", { name: /aprobar/i }));

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(
      "La persona tiene una solicitud de investidura pendiente en este año. Primero se resuelve la autorización.",
    );
    expect(mockToastError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clears the inline banner when the next attempt succeeds", async () => {
    const user = userEvent.setup();
    mockApproveItem
      .mockRejectedValueOnce(
        new ApiError("x", 409, { code: "CERTIFICATE_IMPORT_AUTHORIZATION_PENDING" }),
      )
      .mockResolvedValueOnce({ status: "APPROVED" });
    renderDialog({
      action: "approve",
      scope: "item",
      itemId: "item-1",
      title: "Aprobar fila",
      description: "La fila se aplicará al perfil del miembro.",
    });

    await user.click(screen.getByRole("button", { name: /aprobar/i }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: /aprobar/i }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("toasts the mapped message for the ended-year field restriction", async () => {
    const user = userEvent.setup();
    mockApproveItem.mockRejectedValue(
      new ApiError("texto del backend", 403, { code: "CERTIFICATE_IMPORT_ENDED_YEAR_FIELD_FORBIDDEN" }),
    );
    renderDialog({
      action: "approve",
      scope: "item",
      itemId: "item-1",
      title: "Aprobar fila",
      description: "La fila se aplicará al perfil del miembro.",
    });

    await user.click(screen.getByRole("button", { name: /aprobar/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Solo el Campo de la solicitud o la administración pueden acreditar este certificado.",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps toasting the backend message for other API errors", async () => {
    const user = userEvent.setup();
    mockRejectBatch.mockRejectedValue(new ApiError("Lote ya resuelto", 409, { code: "OTHER" }));
    renderDialog();

    await user.type(screen.getByLabelText(/motivo de rechazo/i), "Fecha ilegible");
    await user.click(screen.getByRole("button", { name: /rechazar/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Lote ya resuelto"));
  });
});
