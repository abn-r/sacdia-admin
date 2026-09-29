import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

// ─── API mocks ────────────────────────────────────────────────────────────────

const mockApprove = vi.fn();
const mockReject = vi.fn();

vi.mock("@/lib/api/institutional-certificate-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/institutional-certificate-requests")>();
  return {
    ...original,
    approveInstitutionalCertificateRequest: (...args: unknown[]) => mockApprove(...args),
    rejectInstitutionalCertificateRequest: (...args: unknown[]) => mockReject(...args),
  };
});

// ─── Toast mock ───────────────────────────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
}));

// ─── Browser API stubs ───────────────────────────────────────────────────────

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ─── Import after mocks ───────────────────────────────────────────────────────

import { InstitutionalCertificateRequestActionDialog } from "@/components/institutional-certificate-requests/institutional-certificate-request-action-dialog";

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderDialog(
  props: Partial<
    React.ComponentProps<typeof InstitutionalCertificateRequestActionDialog>
  > = {},
) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InstitutionalCertificateRequestActionDialog
        open
        action="reject"
        requestId="req-1"
        currentRevision={1}
        title="Rechazar validación"
        description="Esta solicitud será rechazada."
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        {...props}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenChange, onSuccess };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InstitutionalCertificateRequestActionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApprove.mockResolvedValue({ status: "APPROVED", enrollment_created: false });
    mockReject.mockResolvedValue({ status: "REJECTED", enrollment_created: false });
  });

  afterEach(() => cleanup());

  describe("rejection", () => {
    it("does not submit when reason is empty", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /rechazar/i }));

      expect(
        await screen.findByText(/motivo de rechazo es obligatorio/i),
      ).toBeInTheDocument();
      expect(mockReject).not.toHaveBeenCalled();
    });

    it("calls reject with trimmed reason and expected_revision", async () => {
      const user = userEvent.setup();
      const { onSuccess } = renderDialog();

      await user.type(
        screen.getByLabelText(/motivo de rechazo/i),
        "  Comprobante ilegible  ",
      );
      await user.click(screen.getByRole("button", { name: /rechazar/i }));

      await waitFor(() => {
        expect(mockReject).toHaveBeenCalledWith("req-1", {
          expected_revision: 1,
          reason: "Comprobante ilegible",
        });
      });
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  describe("approval", () => {
    it("calls approve with expected_revision and no enrollment_created message", async () => {
      const user = userEvent.setup();
      const { onSuccess } = renderDialog({
        action: "approve",
        title: "Aprobar validación",
        description: "Confirma la validación institucional.",
      });

      await user.click(screen.getByRole("button", { name: /aprobar validación/i }));

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith("req-1", {
          expected_revision: 1,
        });
      });

      // Success toast must say "validación institucional aprobada", NOT "clase registrada"
      const successCall = mockToastSuccess.mock.calls[0]?.[0] as string | undefined;
      expect(successCall).toBeTruthy();
      expect(String(successCall).toLowerCase()).not.toContain("clase registrada");
      expect(String(successCall).toLowerCase()).not.toContain("inscripción creada");

      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("passes optional comment when provided", async () => {
      const user = userEvent.setup();
      renderDialog({
        action: "approve",
        title: "Aprobar validación",
        description: "Confirma la validación.",
      });

      await user.type(
        screen.getByLabelText(/comentario/i),
        "Revisado contra registro físico",
      );
      await user.click(screen.getByRole("button", { name: /aprobar validación/i }));

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith("req-1", {
          expected_revision: 1,
          comment: "Revisado contra registro físico",
        });
      });
    });
  });

  describe("revision conflict", () => {
    it("shows conflict error inline and does not call onSuccess", async () => {
      const user = userEvent.setup();
      mockApprove.mockRejectedValue(
        new Error("CERTIFICATE_IMPORT_REVISION_CONFLICT"),
      );
      const { onSuccess } = renderDialog({
        action: "approve",
        title: "Aprobar",
        description: "Desc.",
      });

      await user.click(screen.getByRole("button", { name: /aprobar validación/i }));

      expect(
        await screen.findByText(/fue modificada por otro revisor/i),
      ).toBeInTheDocument();
      expect(mockToastSuccess).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
