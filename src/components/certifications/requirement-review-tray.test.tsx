import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { TrayItem } from "@/lib/api/certification-reviews";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockGetRequirementTray = vi.fn();
const mockGetRequirementDetail = vi.fn();
const mockApproveRequirement = vi.fn();
const mockRequestRequirementChanges = vi.fn();
const mockGetRequirementEvidenceDownload = vi.fn();

vi.mock("@/lib/api/certification-reviews", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/certification-reviews")>();
  return {
    ...original,
    getRequirementTray: (...args: unknown[]) => mockGetRequirementTray(...args),
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

import { RequirementReviewTray } from "@/components/certifications/requirement-review-tray";

const STUB_ITEM: TrayItem = {
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
};

function renderTray() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequirementReviewTray />
    </NextIntlClientProvider>,
  );
}

describe("RequirementReviewTray", () => {
  beforeEach(() => {
    mockGetRequirementTray.mockReset();
    mockGetRequirementDetail.mockReset();
    mockApproveRequirement.mockReset();
    mockRequestRequirementChanges.mockReset();
    mockGetRequirementEvidenceDownload.mockReset();
    mockGetRequirementTray.mockResolvedValue([STUB_ITEM]);
    mockGetRequirementDetail.mockResolvedValue({
      ...STUB_ITEM,
      lock_version: 3,
      components: [],
      history: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads SUBMITTED tray by default and renders participant rows", async () => {
    renderTray();

    await waitFor(() => {
      expect(mockGetRequirementTray).toHaveBeenCalledWith("SUBMITTED");
    });
    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Capacitación básica")).toBeInTheDocument();
    expect(screen.getByText("Sección 1")).toBeInTheDocument();
  });

  it("refetches when the status filter changes", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("Ana López");

    await user.selectOptions(
      screen.getByLabelText("Estado"),
      "APPROVED",
    );

    await waitFor(() => {
      expect(mockGetRequirementTray).toHaveBeenCalledWith("APPROVED");
    });
  });

  it("opens the detail sheet when Revisar is clicked", async () => {
    const user = userEvent.setup();
    renderTray();
    await screen.findByText("Ana López");

    await user.click(screen.getByRole("button", { name: "Revisar" }));

    await waitFor(() => {
      expect(mockGetRequirementDetail).toHaveBeenCalledWith(1000);
    });
    expect(await screen.findByText("Detalle del requisito")).toBeInTheDocument();
  });
});
