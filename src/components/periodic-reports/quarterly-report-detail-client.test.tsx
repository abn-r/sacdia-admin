import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminQuarterlyReport } from "@/lib/api/reports";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const api = vi.hoisted(() => ({
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  regenerateQuarterly: vi.fn(),
  downloadQuarterly: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: api.refresh }),
}));

vi.mock("sonner", () => ({ toast: { success: api.toastSuccess, error: api.toastError } }));

vi.mock("@/lib/api/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reports")>();
  return {
    ...actual,
    regenerateQuarterlyReport: api.regenerateQuarterly,
    triggerQuarterlyReportPdfDownload: api.downloadQuarterly,
  };
});

import { QuarterlyReportDetailClient } from "./quarterly-report-detail-client";

const quarterly: AdminQuarterlyReport = {
  quarterly_report_id: 11,
  club_id: 4,
  year: 2026,
  quarter: 2,
  status: "draft",
  auto_generated_at: "2026-07-02T15:00:00.000Z",
  finalized_at: null,
  club: { club_id: 4, name: "Club Águilas" },
  computed_data: {
    member_count: 18,
    activities: { total: 7 },
    honors: { started: 5, completed: 3 },
    finances: { income: 1200, expenses: 800, balance: 400, total_balance: 2500, transactions: 9 },
    directiva: [{ role: "director", user_id: "u1", name: "Ana García" }],
    monthly_data: {
      months_submitted: 2,
      months_covered: [
        { year: 2026, month: 4 },
        { year: 2026, month: 5 },
      ],
      planning_meetings: 6,
      parent_meetings: null,
      certificates_delivered: true,
      club_participation_description: [
        { year: 2026, month: 4, text: "Campamento de primavera" },
        { year: 2026, month: 5, text: "Feria misionera" },
      ],
      community_service_description: null,
    },
  },
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const DEFAULTS = { canRegenerate: true, canDownload: true };
const closed: AdminQuarterlyReport = {
  ...quarterly,
  status: "finalized",
  finalized_at: "2026-07-17T03:00:00.000Z",
  finalized_by: null,
};

describe("QuarterlyReportDetailClient", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows an open report as En curso with computed and monthly data, no edit or finalize actions", () => {
    wrap(<QuarterlyReportDetailClient report={quarterly} {...DEFAULTS} />);

    expect(screen.getByText("Trimestre 2 de 2026")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByText("Resultado del periodo")).toBeInTheDocument();
    expect(screen.getByText("Saldo acumulado")).toBeInTheDocument();
    expect(screen.getByText(/Informe en curso/)).toBeInTheDocument();
    expect(screen.getByText("Basado en 2 meses con informe mensual enviado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar datos manuales" })).not.toBeInTheDocument();
    // Recalcular is only offered on closed reports.
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  });

  it("formats monthly values: dashes for null, Sí/No for booleans, month names for texts", () => {
    wrap(<QuarterlyReportDetailClient report={quarterly} {...DEFAULTS} />);

    expect(screen.getByText("Se entregaron certificados").nextElementSibling).toHaveTextContent("Sí");
    expect(screen.getByText("Reuniones de padres").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText(/Abril de 2026:/)).toBeInTheDocument();
    expect(screen.getByText("Campamento de primavera")).toBeInTheDocument();
    expect(screen.getByText(/Mayo de 2026:/)).toBeInTheDocument();
    expect(screen.getAllByText("Sin respuesta").length).toBeGreaterThan(0);
  });

  it("does not crash on old rows without monthly_data and hints that nothing was submitted", () => {
    wrap(
      <QuarterlyReportDetailClient
        report={{
          ...quarterly,
          computed_data: { member_count: 3, finances: { balance: 10, total_balance: null } },
        }}
        {...DEFAULTS}
      />,
    );

    expect(screen.getByText(/no envió ningún informe mensual/)).toBeInTheDocument();
    expect(screen.getByText("Reuniones de planificación").nextElementSibling).toHaveTextContent("—");
  });

  it("shows a closed report as Cerrado with its closing date and the frozen notice", () => {
    wrap(<QuarterlyReportDetailClient report={closed} {...DEFAULTS} />);

    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.getByText("Cerrado el")).toBeInTheDocument();
    expect(screen.getByText(/Informe cerrado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  });

  it("shows translated directiva role names and falls back for unknown roles", () => {
    wrap(
      <QuarterlyReportDetailClient
        report={{
          ...quarterly,
          computed_data: {
            ...quarterly.computed_data,
            directiva: [
              { role: "director", user_id: "u1", name: "Ana" },
              { role: "deputy-director", user_id: "u2", name: "Beto" },
              { role: "custom-role", user_id: "u5", name: "Eva" },
            ],
          },
        }}
        {...DEFAULTS}
      />,
    );

    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(screen.getByText("Subdirector")).toBeInTheDocument();
    expect(screen.getByText("Custom Role")).toBeInTheDocument();
    expect(screen.queryByText("deputy-director")).not.toBeInTheDocument();
  });

  it("hides Recalcular for users who are not global admins and the PDF without reports:download", () => {
    wrap(<QuarterlyReportDetailClient report={closed} canRegenerate={false} canDownload={false} />);

    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before recalculating a closed report and only then calls the API", async () => {
    api.regenerateQuarterly.mockResolvedValue({ ...closed });
    wrap(<QuarterlyReportDetailClient report={closed} {...DEFAULTS} />);

    fireEvent.click(screen.getByRole("button", { name: "Recalcular" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Recalcular este informe cerrado?");
    expect(api.regenerateQuarterly).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Recalcular informe" }));

    await waitFor(() => expect(api.regenerateQuarterly).toHaveBeenCalledWith(11));
    await waitFor(() => expect(api.toastSuccess).toHaveBeenCalledWith("Datos recalculados."));
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
  });

  it("does not recalculate when the confirmation is cancelled", async () => {
    wrap(<QuarterlyReportDetailClient report={closed} {...DEFAULTS} />);

    fireEvent.click(screen.getByRole("button", { name: "Recalcular" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.regenerateQuarterly).not.toHaveBeenCalled();
  });

  it("downloads the PDF", async () => {
    api.downloadQuarterly.mockResolvedValue(undefined);
    wrap(<QuarterlyReportDetailClient report={quarterly} {...DEFAULTS} />);

    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));
    await waitFor(() => expect(api.downloadQuarterly).toHaveBeenCalledWith(11));
  });
});
