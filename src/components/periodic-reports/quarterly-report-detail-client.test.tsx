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
  finalizeQuarterly: vi.fn(),
  updateQuarterlyManual: vi.fn(),
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
    finalizeQuarterlyReport: api.finalizeQuarterly,
    updateQuarterlyReportManualData: api.updateQuarterlyManual,
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
    finances: { income: 1200, expenses: 800, balance: 400, transactions: 9 },
    directiva: [{ role: "director", user_id: "u1", name: "Ana García" }],
  },
  manual_data: { planning_meetings: 6, certificates_delivered: true },
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const ALL_ALLOWED = { canUpdate: true, canFinalize: true, canDownload: true };

describe("QuarterlyReportDetailClient", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the computed data readably and the manual form while the report is a draft", () => {
    wrap(<QuarterlyReportDetailClient report={quarterly} {...ALL_ALLOWED} />);

    expect(screen.getByText("Trimestre 2 de 2026")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar datos manuales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recalcular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar" })).toBeInTheDocument();
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
              { role: "secretary-treasurer", user_id: "u3", name: "Carla" },
              { role: "treasurer", user_id: "u4", name: "Diego" },
              { role: "custom-role", user_id: "u5", name: "Eva" },
            ],
          },
        }}
        {...ALL_ALLOWED}
      />,
    );

    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(screen.getByText("Subdirector")).toBeInTheDocument();
    expect(screen.getByText("Secretario tesorero")).toBeInTheDocument();
    expect(screen.getByText("Tesorero")).toBeInTheDocument();
    expect(screen.getByText("Custom Role")).toBeInTheDocument();
    expect(screen.queryByText("deputy-director")).not.toBeInTheDocument();
    expect(screen.queryByText("secretary-treasurer")).not.toBeInTheDocument();
  });

  it("hides the manual form, Recalcular and Finalizar once finalized", () => {
    wrap(
      <QuarterlyReportDetailClient
        report={{
          ...quarterly,
          status: "finalized",
          finalized_at: "2026-07-10T12:00:00.000Z",
          finalized_by_user: { user_id: "u1", name: "Ana", paternal_last_name: "García" },
        }}
        {...ALL_ALLOWED}
      />,
    );

    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar datos manuales" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    // Manual answers stay visible, read-only, and the PDF stays downloadable.
    expect(screen.getByText("Se entregaron certificados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  });

  it("hides the edit actions for users without reports:update", () => {
    wrap(
      <QuarterlyReportDetailClient
        report={quarterly}
        canUpdate={false}
        canFinalize={false}
        canDownload={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Guardar datos manuales" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recalcular" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before finalizing and only then calls the API", async () => {
    api.finalizeQuarterly.mockResolvedValue({ ...quarterly, status: "finalized" });
    wrap(<QuarterlyReportDetailClient report={quarterly} {...ALL_ALLOWED} />);

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Finalizar este informe?");
    expect(dialog).toHaveTextContent("irreversible");
    expect(api.finalizeQuarterly).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Finalizar informe" }));

    await waitFor(() => expect(api.finalizeQuarterly).toHaveBeenCalledWith(11));
    await waitFor(() => expect(screen.getByText("Finalizado")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
  });

  it("does not finalize when the confirmation is cancelled", async () => {
    wrap(<QuarterlyReportDetailClient report={quarterly} {...ALL_ALLOWED} />);

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.finalizeQuarterly).not.toHaveBeenCalled();
  });

  it("recalculates and downloads", async () => {
    api.regenerateQuarterly.mockResolvedValue({ ...quarterly });
    api.downloadQuarterly.mockResolvedValue(undefined);
    wrap(<QuarterlyReportDetailClient report={quarterly} {...ALL_ALLOWED} />);

    fireEvent.click(screen.getByRole("button", { name: "Recalcular" }));
    await waitFor(() => expect(api.regenerateQuarterly).toHaveBeenCalledWith(11));

    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));
    await waitFor(() => expect(api.downloadQuarterly).toHaveBeenCalledWith(11));
  });

  it("saves manual data as a typed payload and rejects non-numeric input", async () => {
    api.updateQuarterlyManual.mockResolvedValue({ ...quarterly });
    wrap(<QuarterlyReportDetailClient report={quarterly} {...ALL_ALLOWED} />);

    const parents = screen.getByLabelText("Reuniones de padres");
    fireEvent.change(parents, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos manuales" }));
    expect(await screen.findByText("Escribe un número entero de 0 en adelante.")).toBeInTheDocument();
    expect(api.updateQuarterlyManual).not.toHaveBeenCalled();

    fireEvent.change(parents, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos manuales" }));

    await waitFor(() =>
      expect(api.updateQuarterlyManual).toHaveBeenCalledWith(11, {
        planning_meetings: 6,
        parent_meetings: 3,
        certificates_delivered: true,
      }),
    );
  });
});
