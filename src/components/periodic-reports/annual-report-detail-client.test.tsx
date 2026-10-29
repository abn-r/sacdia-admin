import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminAnnualReport } from "@/lib/api/reports";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const api = vi.hoisted(() => ({
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  regenerateAnnual: vi.fn(),
  finalizeAnnual: vi.fn(),
  updateAnnualManual: vi.fn(),
  downloadAnnual: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: api.refresh }),
}));

vi.mock("sonner", () => ({ toast: { success: api.toastSuccess, error: api.toastError } }));

vi.mock("@/lib/api/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reports")>();
  return {
    ...actual,
    regenerateAnnualReport: api.regenerateAnnual,
    finalizeAnnualReport: api.finalizeAnnual,
    updateAnnualReportManualData: api.updateAnnualManual,
    triggerAnnualReportPdfDownload: api.downloadAnnual,
  };
});

import { AnnualReportDetailClient } from "./annual-report-detail-client";

const annual: AdminAnnualReport = {
  annual_report_id: 31,
  club_id: 4,
  ecclesiastical_year_id: 11,
  ecclesiastical_year: { year_id: 11, start_date: "2025-08-01", end_date: "2026-07-31" },
  status: "draft",
  auto_generated_at: "2026-07-02T15:00:00.000Z",
  club: { club_id: 4, name: "Club Águilas" },
  computed_data: { member_count: 18, months_reported: 12, top_achievers: [] },
  manual_data: null,
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const ALL_ALLOWED = { canUpdate: true, canFinalize: true, canDownload: true };

describe("AnnualReportDetailClient", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the ecclesiastical year and the draft actions", () => {
    wrap(<AnnualReportDetailClient report={annual} {...ALL_ALLOWED} />);

    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar datos manuales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recalcular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar" })).toBeInTheDocument();
  });

  it("shows translated directiva role names and falls back for unknown roles", () => {
    wrap(
      <AnnualReportDetailClient
        report={{
          ...annual,
          computed_data: {
            ...annual.computed_data,
            directiva: [
              { role: "deputy-director", user_id: "u2", name: "Beto" },
              { role: "secretary", user_id: "u3", name: "Carla" },
              { role: "custom-role", user_id: "u5", name: "Eva" },
            ],
          },
        }}
        {...ALL_ALLOWED}
      />,
    );

    expect(screen.getByText("Subdirector")).toBeInTheDocument();
    expect(screen.getByText("Secretario")).toBeInTheDocument();
    expect(screen.getByText("Custom Role")).toBeInTheDocument();
    expect(screen.queryByText("deputy-director")).not.toBeInTheDocument();
  });

  it("hides the manual form and the edit actions when finalized", () => {
    wrap(
      <AnnualReportDetailClient
        report={{ ...annual, status: "finalized", finalized_at: "2026-08-01T12:00:00.000Z" }}
        {...ALL_ALLOWED}
      />,
    );

    expect(screen.queryByRole("button", { name: "Guardar datos manuales" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before finalizing", async () => {
    api.finalizeAnnual.mockResolvedValue({ ...annual, status: "finalized" });
    wrap(<AnnualReportDetailClient report={annual} {...ALL_ALLOWED} />);

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("irreversible");
    expect(api.finalizeAnnual).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Finalizar informe" }));
    await waitFor(() => expect(api.finalizeAnnual).toHaveBeenCalledWith(31));
  });
});
