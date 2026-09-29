import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InstitutionalCertificateRequest } from "@/lib/api/institutional-certificate-requests";

const session = vi.hoisted(() => ({
  isSuperAdmin: true,
  roles: new Set<string>(["super-admin"]),
}));

const mockDownload = vi.hoisted(() => vi.fn());
const mockApprove = vi.hoisted(() => vi.fn());
const mockReject = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    can: () => session.isSuperAdmin,
    canAny: () => session.isSuperAdmin,
    canAll: () => session.isSuperAdmin,
    isSuperAdmin: session.isSuperAdmin,
    permissions: new Set<string>(),
    roles: session.roles,
  }),
}));

vi.mock("@/lib/api/certificate-bulk-imports", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/certificate-bulk-imports")>();
  return {
    ...original,
    getCertificateBulkImportFileDownloadUrl: (...args: unknown[]) =>
      mockDownload(...args),
  };
});

vi.mock("@/lib/api/institutional-certificate-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/institutional-certificate-requests")>();
  return {
    ...original,
    approveInstitutionalCertificateRequest: (...args: unknown[]) =>
      mockApprove(...args),
    rejectInstitutionalCertificateRequest: (...args: unknown[]) =>
      mockReject(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { InstitutionalCertificateRequestListPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-list-page";
import { InstitutionalCertificateRequestDetailPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-detail-page";

const pending: InstitutionalCertificateRequest = {
  request_id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  class_id: 9,
  asset_code: "GM-02",
  class_name: "Guía Mayor Avanzado",
  file_id: "file-1",
  batch_id: "batch-1",
  status: "PENDING_REVIEW",
  revision: 0,
  completed_at: "1991-03-03",
  applicant_name: "Ana Solís",
  approval_blockers: [],
  enrollment_created: false,
  events: [
    {
      event_id: "event-1",
      action: "REQUEST_SUBMITTED",
      revision: 0,
      created_at: "2026-09-22T12:00:00.000Z",
    },
  ],
};

const rejected: InstitutionalCertificateRequest = {
  ...pending,
  request_id: "22222222-2222-2222-2222-222222222222",
  asset_code: "GM-03",
  class_name: "Instructor",
  applicant_name: "Luis Peña",
  status: "REJECTED",
  decision_reason: "No coincide",
};

function renderWithMessages(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("institutional certificate inbox screens", () => {
  beforeEach(() => {
    session.isSuperAdmin = true;
    session.roles = new Set(["super-admin"]);
    mockDownload.mockResolvedValue({
      file_id: "file-1",
      download_url: "https://files.example/sealed/proof.jpg?signature=1",
      expires_in: 900,
    });
    mockApprove.mockResolvedValue({
      status: "APPROVED",
      enrollment_created: false,
    });
    mockReject.mockResolvedValue({
      status: "REJECTED",
      enrollment_created: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists only the matching institutional request and links to its detail", async () => {
    const user = userEvent.setup();
    renderWithMessages(
      <InstitutionalCertificateRequestListPage
        requests={[pending, rejected]}
        total={2}
      />,
    );

    expect(screen.getByText("Ana Solís")).toBeInTheDocument();
    expect(screen.getByText("Luis Peña")).toBeInTheDocument();
    expect(
      screen.getByText(/no inscripción de clase/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/buscar solicitante/i),
      "ana",
    );
    expect(screen.getByText("Ana Solís")).toBeInTheDocument();
    expect(screen.queryByText("Luis Peña")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/buscar solicitante/i));
    await user.click(screen.getByRole("button", { name: "Rechazadas" }));
    expect(screen.getByText("Luis Peña")).toBeInTheDocument();
    expect(screen.queryByText("Ana Solís")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pendientes" }));
    const review = screen.getByRole("link", { name: /revisar/i });
    expect(review).toHaveAttribute(
      "href",
      "/dashboard/institutional-certificate-requests/11111111-1111-1111-1111-111111111111",
    );
  });

  it("shows the signed proof and approves one request without calling it a class enrollment", async () => {
    const user = userEvent.setup();
    renderWithMessages(
      <InstitutionalCertificateRequestDetailPage request={pending} />,
    );

    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith("batch-1", "file-1");
    });
    const proof = await screen.findByRole("img", { name: "Comprobante" });
    expect(proof).toHaveAttribute(
      "src",
      "https://files.example/sealed/proof.jpg?signature=1",
    );
    expect(screen.getByRole("link", { name: /^abrir$/i })).toHaveAttribute(
      "href",
      "https://files.example/sealed/proof.jpg?signature=1",
    );

    await user.click(
      screen.getByRole("button", { name: /aprobar validación/i }),
    );
    expect(
      screen.getByText(/la aprobación no crea una inscripción de clase/i),
    ).toBeInTheDocument();

    const approveButtons = screen.getAllByRole("button", {
      name: /aprobar validación/i,
    });
    await user.click(approveButtons[approveButtons.length - 1]);
    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(pending.request_id, {
        expected_revision: 0,
      });
    });
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("rejects one request with a reason and hides both actions from other roles", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithMessages(
      <InstitutionalCertificateRequestDetailPage request={pending} />,
    );

    await user.click(screen.getByRole("button", { name: /^rechazar$/i }));
    await user.type(
      screen.getByLabelText(/motivo de rechazo/i),
      "No coincide con la persona",
    );
    const rejectButtons = screen.getAllByRole("button", { name: /^rechazar$/i });
    await user.click(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(pending.request_id, {
        expected_revision: 0,
        reason: "No coincide con la persona",
      });
    });

    unmount();
    session.isSuperAdmin = false;
    session.roles = new Set(["director-lf"]);
    renderWithMessages(
      <InstitutionalCertificateRequestDetailPage request={pending} />,
    );

    expect(
      screen.queryByRole("button", { name: /aprobar validación/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^rechazar$/i }),
    ).not.toBeInTheDocument();
  });
});
