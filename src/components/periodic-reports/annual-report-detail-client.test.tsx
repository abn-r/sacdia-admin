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
  computed_data: {
    member_count: 18,
    months_reported: 12,
    finances: { income: 5000, expenses: 3000, balance: 2000, total_balance: 7500, transactions: 40 },
    top_achievers: [{ user_id: "u9", name: "Luis Pérez", honors_count: 4 }],
    monthly_data: {
      months_submitted: 1,
      months_covered: [{ year: 2026, month: 3 }],
      planning_meetings: 4,
      baptized_this_year: null,
      all_investitures_completed: null,
      annual_achievements_description: null,
      community_service_description: [{ year: 2026, month: 3, text: "Limpieza del parque" }],
    },
  },
};
const closed: AdminAnnualReport = {
  ...annual,
  status: "finalized",
  finalized_at: "2026-08-17T03:30:00.000Z",
  finalized_by: null,
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const DEFAULTS = { canRegenerate: true, canDownload: true };

describe("AnnualReportDetailClient", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the ecclesiastical year, En curso status, finances and monthly data without ranking", () => {
    wrap(<AnnualReportDetailClient report={annual} {...DEFAULTS} />);

    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("Resultado del periodo")).toBeInTheDocument();
    expect(screen.getByText("Saldo acumulado")).toBeInTheDocument();
    expect(screen.queryByText("Percentil en el ranking")).not.toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("Basado en 1 mes con informe mensual enviado")).toBeInTheDocument();
    expect(screen.getByText("Reuniones de planificación").nextElementSibling).toHaveTextContent("4");
    expect(screen.getByText("Bautizados en el año").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText(/Marzo de 2026:/)).toBeInTheDocument();
    expect(screen.getByText("Limpieza del parque")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
  });

  it("does not crash on old rows without monthly_data", () => {
    wrap(
      <AnnualReportDetailClient
        report={{ ...annual, computed_data: { member_count: 2 } }}
        {...DEFAULTS}
      />,
    );

    expect(screen.getByText(/no envió ningún informe mensual/)).toBeInTheDocument();
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
        {...DEFAULTS}
      />,
    );

    expect(screen.getByText("Subdirector")).toBeInTheDocument();
    expect(screen.getByText("Secretario")).toBeInTheDocument();
    expect(screen.getByText("Custom Role")).toBeInTheDocument();
    expect(screen.queryByText("deputy-director")).not.toBeInTheDocument();
  });

  it("shows Cerrado with the closing date and offers Recalcular only to global admins", () => {
    wrap(<AnnualReportDetailClient report={closed} {...DEFAULTS} />);

    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.getByText("Cerrado el")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recalcular" })).toBeInTheDocument();

    cleanup();
    wrap(<AnnualReportDetailClient report={closed} canRegenerate={false} canDownload />);
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before recalculating a closed report", async () => {
    api.regenerateAnnual.mockResolvedValue({ ...closed });
    wrap(<AnnualReportDetailClient report={closed} {...DEFAULTS} />);

    fireEvent.click(screen.getByRole("button", { name: "Recalcular" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("¿Recalcular este informe cerrado?");
    expect(api.regenerateAnnual).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Recalcular informe" }));
    await waitFor(() => expect(api.regenerateAnnual).toHaveBeenCalledWith(31));
  });
});
