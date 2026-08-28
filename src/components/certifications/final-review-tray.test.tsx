import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { FinalTrayItem } from "@/lib/api/certification-reviews";
import { toast } from "sonner";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockGetFinalTray = vi.fn();
const mockApproveCloseoutEvidence = vi.fn();
const mockRequestCloseoutChanges = vi.fn();
const mockCertify = vi.fn();
const mockGetCloseoutEvidenceDownload = vi.fn();
const mockCan = vi.fn();

vi.mock("@/lib/api/certification-reviews", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/certification-reviews")>();
  return {
    ...original,
    getFinalTray: (...args: unknown[]) => mockGetFinalTray(...args),
    approveCloseoutEvidence: (...args: unknown[]) =>
      mockApproveCloseoutEvidence(...args),
    requestCloseoutChanges: (...args: unknown[]) =>
      mockRequestCloseoutChanges(...args),
    certify: (...args: unknown[]) => mockCertify(...args),
    getCloseoutEvidenceDownload: (...args: unknown[]) =>
      mockGetCloseoutEvidenceDownload(...args),
  };
});

vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockCan(permission),
    canAny: () => false,
    canAll: () => false,
    isSuperAdmin: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { FinalReviewTray } from "@/components/certifications/final-review-tray";

const SUBMITTED_ITEM: FinalTrayItem = {
  enrollment_id: 42,
  certification_id: 1,
  certification_name: "Capacitación básica",
  status: "SUBMITTED_FOR_FINAL_REVIEW",
  submitted_at: "2026-01-02T00:00:00.000Z",
  participant: {
    user_id: "user-1",
    name: "Ana",
    paternal_last_name: "López",
  },
  closeout_evidence: {
    closeout_evidence_id: 7,
    review_status: "SUBMITTED",
    upload_status: "CONFIRMED",
    original_filename: "junta.pdf",
    mime_type: "application/pdf",
  },
};

const APPROVED_ITEM: FinalTrayItem = {
  ...SUBMITTED_ITEM,
  enrollment_id: 43,
  status: "APPROVED",
  closeout_evidence: {
    closeout_evidence_id: 8,
    review_status: "APPROVED",
    upload_status: "CONFIRMED",
    original_filename: "junta-ok.pdf",
    mime_type: "application/pdf",
  },
};

function renderTray() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FinalReviewTray />
    </NextIntlClientProvider>,
  );
}

describe("FinalReviewTray", () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    mockGetFinalTray.mockReset();
    mockApproveCloseoutEvidence.mockReset();
    mockRequestCloseoutChanges.mockReset();
    mockCertify.mockReset();
    mockGetCloseoutEvidenceDownload.mockReset();
    mockCan.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
    mockGetFinalTray.mockResolvedValue([SUBMITTED_ITEM, APPROVED_ITEM]);
    mockApproveCloseoutEvidence.mockResolvedValue({
      enrollment_id: 42,
      status: "APPROVED",
    });
    mockRequestCloseoutChanges.mockResolvedValue({
      enrollment_id: 42,
      status: "CHANGES_REQUESTED",
    });
    mockCertify.mockResolvedValue({
      enrollment_id: 43,
      status: "CERTIFIED",
      already_certified: false,
    });
    mockGetCloseoutEvidenceDownload.mockResolvedValue({
      url: "https://signed.example/junta.pdf",
      expires_in: 900,
      original_filename: "junta.pdf",
      mime_type: "application/pdf",
    });
    mockCan.mockImplementation(
      (permission: string) => permission === "certifications:certify",
    );
    openSpy.mockReset();
    vi.stubGlobal("open", openSpy);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders closeout rows and requests signed URL on Ver", async () => {
    const user = userEvent.setup();
    renderTray();

    expect((await screen.findAllByText("Ana López")).length).toBeGreaterThan(0);
    expect(mockGetCloseoutEvidenceDownload).not.toHaveBeenCalled();

    await user.click(
      screen.getAllByRole("button", { name: /Ver junta/i })[0]!,
    );

    await waitFor(() => {
      expect(mockGetCloseoutEvidenceDownload).toHaveBeenCalledWith(42);
    });
    expect(openSpy).toHaveBeenCalledWith(
      "https://signed.example/junta.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("approves closeout evidence for SUBMITTED_FOR_FINAL_REVIEW rows", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findAllByText("Ana López");

    await user.click(
      screen.getByRole("button", { name: "Aprobar comprobante" }),
    );

    await waitFor(() => {
      expect(mockApproveCloseoutEvidence).toHaveBeenCalledWith(42);
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("requires a comment before returning a closeout", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findAllByText("Ana López");

    await user.click(screen.getAllByRole("button", { name: "Devolver" })[0]!);
    const dialog = await screen.findByRole("dialog");
    const submit = screen.getByRole("button", { name: "Devolver" });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByLabelText("Comentario"),
      "Falta firma del director",
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(mockRequestCloseoutChanges).toHaveBeenCalledWith(
        42,
        "Falta firma del director",
      );
    });
    expect(dialog).toBeTruthy();
  });

  it("shows Certificar only with certifications:certify on APPROVED rows and confirms", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findAllByText("Ana López");

    expect(screen.getByRole("button", { name: "Certificar" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Certificar" }));
    expect(
      await screen.findByText("Confirmar certificación"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, certificar" }));

    await waitFor(() => {
      expect(mockCertify).toHaveBeenCalledWith(43);
    });
  });

  it("hides Certificar when the user lacks certifications:certify", async () => {
    mockCan.mockReturnValue(false);
    renderTray();
    await screen.findAllByText("Ana López");
    expect(screen.queryByRole("button", { name: "Certificar" })).toBeNull();
  });
});
