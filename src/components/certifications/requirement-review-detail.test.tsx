import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { RequirementReviewDetail } from "@/lib/api/certification-reviews";
import { toast } from "sonner";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockGetRequirementDetail = vi.fn();
const mockApproveRequirement = vi.fn();
const mockRequestRequirementChanges = vi.fn();
const mockGetRequirementEvidenceDownload = vi.fn();

vi.mock("@/lib/api/certification-reviews", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/certification-reviews")>();
  return {
    ...original,
    getRequirementDetail: (...args: unknown[]) =>
      mockGetRequirementDetail(...args),
    approveRequirement: (...args: unknown[]) => mockApproveRequirement(...args),
    requestRequirementChanges: (...args: unknown[]) =>
      mockRequestRequirementChanges(...args),
    getRequirementEvidenceDownload: (...args: unknown[]) =>
      mockGetRequirementEvidenceDownload(...args),
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { RequirementReviewDetail as RequirementReviewDetailSheet } from "@/components/certifications/requirement-review-detail";

const STUB_DETAIL: RequirementReviewDetail = {
  progress_id: 1000,
  enrollment_id: 42,
  certification_id: 1,
  certification_name: "Capacitación básica",
  module_id: 10,
  module_name: "Módulo 1",
  section_id: 20,
  section_name: "Sección 1",
  status: "SUBMITTED",
  submitted_at: "2026-01-02T00:00:00.000Z",
  participant: {
    user_id: "user-1",
    name: "Ana",
    paternal_last_name: "López",
  },
  lock_version: 3,
  components: [
    {
      component_id: 1,
      component_type: "TEXT",
      label: "Describe tu experiencia",
      required: true,
      response: {
        text_value: "Participé en el campamento",
        attestation_confirmed: null,
        linked_user_honor_id: null,
        linked_activity_id: null,
      },
      evidences: [
        {
          evidence_id: 55,
          original_filename: "acta.pdf",
          mime_type: "application/pdf",
          size_bytes: 1024,
          upload_status: "CONFIRMED",
        },
      ],
    },
    {
      component_id: 2,
      component_type: "ATTESTATION",
      label: "Confirmo lectura",
      required: true,
      response: {
        text_value: null,
        attestation_confirmed: true,
        linked_user_honor_id: null,
        linked_activity_id: null,
      },
      evidences: [],
    },
  ],
  history: [
    {
      review_event_id: 9,
      event_type: "SUBMITTED",
      comment: null,
      performed_by_id: "user-1",
      from_status: "DRAFT",
      to_status: "SUBMITTED",
      created_at: "2026-01-02T00:00:00.000Z",
    },
  ],
};

function renderDetail(overrides: Partial<React.ComponentProps<typeof RequirementReviewDetailSheet>> = {}) {
  const onOpenChange = vi.fn();
  const onChanged = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequirementReviewDetailSheet
        progressId={1000}
        open
        onOpenChange={onOpenChange}
        onChanged={onChanged}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
  return { onOpenChange, onChanged };
}

describe("RequirementReviewDetail", () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    mockGetRequirementDetail.mockReset();
    mockApproveRequirement.mockReset();
    mockRequestRequirementChanges.mockReset();
    mockGetRequirementEvidenceDownload.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
    mockGetRequirementDetail.mockResolvedValue(STUB_DETAIL);
    mockApproveRequirement.mockResolvedValue({
      progress_id: 1000,
      status: "APPROVED",
    });
    mockRequestRequirementChanges.mockResolvedValue({
      progress_id: 1000,
      status: "CHANGES_REQUESTED",
    });
    mockGetRequirementEvidenceDownload.mockResolvedValue({
      url: "https://signed.example/acta.pdf",
      expires_in: 900,
      original_filename: "acta.pdf",
      mime_type: "application/pdf",
    });
    openSpy.mockReset();
    vi.stubGlobal("open", openSpy);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders component responses by type and history", async () => {
    renderDetail();

    expect(
      await screen.findByText("Participé en el campamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Constancia confirmada")).toBeInTheDocument();
    expect(screen.getByText("SUBMITTED")).toBeInTheDocument();
  });

  it("disables request-changes until a comment is provided", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText("Participé en el campamento");

    const requestBtn = screen.getByRole("button", { name: "Devolver" });
    expect(requestBtn).toBeDisabled();

    await user.type(
      screen.getByLabelText("Comentario"),
      "Falta evidencia legible",
    );
    expect(requestBtn).toBeEnabled();

    await user.click(requestBtn);
    await waitFor(() => {
      expect(mockRequestRequirementChanges).toHaveBeenCalledWith(
        1000,
        3,
        "Falta evidencia legible",
      );
    });
  });

  it("requests a signed URL only when Ver is clicked", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText("acta.pdf");

    expect(mockGetRequirementEvidenceDownload).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Ver acta.pdf" }),
    );

    await waitFor(() => {
      expect(mockGetRequirementEvidenceDownload).toHaveBeenCalledWith(1000, 55);
    });
    expect(openSpy).toHaveBeenCalledWith(
      "https://signed.example/acta.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("approves with the detail lock_version", async () => {
    const user = userEvent.setup();
    const { onChanged, onOpenChange } = renderDetail();
    await screen.findByText("Participé en el campamento");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() => {
      expect(mockApproveRequirement).toHaveBeenCalledWith(1000, 3);
    });
    expect(onChanged).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
