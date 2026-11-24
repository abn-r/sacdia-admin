import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { MonthlyReport } from "@/lib/api/monthly-reports";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const api = vi.hoisted(() => ({
  generate: vi.fn(),
  regenerate: vi.fn(),
  submit: vi.fn(),
  download: vi.fn(),
  waitFor: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  search: { current: "" },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
  toastDismiss: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: api.refresh, replace: api.replace, push: vi.fn() }),
  usePathname: () => "/dashboard/reports/28f20ec9",
  useSearchParams: () => new URLSearchParams(api.search.current),
}));

vi.mock("sonner", () => ({
  toast: {
    success: api.toastSuccess,
    error: api.toastError,
    loading: api.toastLoading,
    dismiss: api.toastDismiss,
  },
}));

vi.mock("@/lib/api/monthly-reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/monthly-reports")>("@/lib/api/monthly-reports");
  return {
    ...actual,
    generateReport: api.generate,
    regenerateReport: api.regenerate,
    submitReport: api.submit,
    triggerMonthlyReportPdfDownload: api.download,
    waitForMonthlyReport: api.waitFor,
  };
});

vi.mock("@/components/reports/manual-data-form", () => ({
  ManualDataForm: () => <div>manual-form</div>,
}));

import { ReportDetailClient } from "./report-detail-client";

const baseReport: MonthlyReport = {
  report_id: "28f20ec9-4f10-4827-b4cd-29ccbc423c34",
  enrollment_id: "f7568929-20b6-427a-9b75-08d4a200cdd9",
  month: 10,
  year: 2026,
  status: "draft",
  auto_data: null,
  manual_data: null,
  snapshot_data: null,
  club_enrollment: {
    club_section: { clubs: { name: "Club Orión" }, club_types: { name: "Aventureros" } },
  },
};

// Real shape returned by GET /monthly-reports/:id (nested snapshot_data).
const nestedSnapshot = {
  member_count: 14,
  meeting_days: "Sábado",
  directiva: [
    { user_id: "u-1", name: "Ana Pérez", role: "director" },
    { user_id: "u-2", name: "Luis Gómez", role: "subdirector" },
  ],
  honors: {
    started: 3,
    completed: 1,
    details: [{ honor_name: "Nudos", user_name: "Marta Ruiz", validated: true, date: "2026-10-10" }],
  },
  activities: {
    total: 2,
    list: [
      { activity_id: 7, name: "Caminata", type: "Campamento", date: "2026-10-05" },
      { activity_id: 8, name: "Servicio comunitario", type: "Servicio", date: "2026-10-19" },
    ],
  },
  finances: { income: 500, expenses: 120, balance: 380, transactions: 6, total_balance: 2079 },
};

const generated: MonthlyReport = {
  ...baseReport,
  status: "generated",
  generated_at: "2026-11-06T16:14:00.000Z",
  pdf_generated_at: "2026-11-06T16:15:00.000Z",
  snapshot_data: nestedSnapshot,
};

function renderDetail(report: MonthlyReport, props: { previewFailed?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReportDetailClient report={report} {...props} />
    </NextIntlClientProvider>,
  );
}

function valueOf(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  api.search.current = "";
});
afterEach(cleanup);

describe("ReportDetailClient header", () => {
  it("names the period, club and section, and marks a draft", () => {
    renderDetail(baseReport);

    expect(screen.getByRole("heading", { level: 1, name: "Octubre 2026 · Club Orión · Aventureros" })).toBeInTheDocument();
    expect(screen.getByText("Borrador").closest("[data-slot=badge]")).not.toBeNull();
    expect(screen.getByText(/los datos se actualizan hasta que generes el informe/)).toBeInTheDocument();
  });

  it("says when the data was frozen instead of repeating it in a Snapshot tab", () => {
    renderDetail(generated);

    expect(screen.getByText(/Generado el .* · los datos quedaron congelados/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /snapshot/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Datos del sistema",
      "Datos del club",
    ]);
  });

  it("gives a sent report the same plain Enviado as the list and names both dates", () => {
    renderDetail({ ...generated, status: "submitted", submitted_at: "2026-11-07T10:00:00.000Z" });

    expect(screen.getByText("Enviado").closest("[data-slot=badge]")).toBeNull();
    expect(screen.getByText(/Generado el .* · enviado el .* · los datos quedaron congelados/)).toBeInTheDocument();
  });

  it("opens the club data tab from the URL", () => {
    api.search.current = "tab=club";
    renderDetail(baseReport);

    expect(screen.getByText("manual-form")).toBeInTheDocument();
  });
});

describe("ReportDetailClient data", () => {
  it("reads the frozen snapshot of a generated report into sections", () => {
    renderDetail(generated);

    expect(screen.queryByText("No hay datos disponibles para este período.")).not.toBeInTheDocument();
    expect(valueOf("Total miembros")).toBe("14");
    expect(valueOf("Actividades")).toBe("2");
    expect(valueOf("Especialidades iniciadas")).toBe("3");
    expect(valueOf("Ingresos del mes")).toBe("500");
    expect(valueOf("Balance total")).toBe("2,079");
    expect(valueOf("Días de reunión")).toBe("Sábado");
    expect(screen.getByRole("heading", { name: "Club" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finanzas" })).toBeInTheDocument();
  });

  it("lists directiva, activities and honors", () => {
    renderDetail(generated);

    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Caminata")).toBeInTheDocument();
    expect(screen.getByText("Nudos — Marta Ruiz")).toBeInTheDocument();
  });

  it("falls back to dashes for missing keys instead of crashing", () => {
    renderDetail({ ...generated, snapshot_data: { member_count: 5, honors: null } });

    expect(valueOf("Total miembros")).toBe("5");
    expect(valueOf("Especialidades iniciadas")).toBe("—");
    expect(valueOf("Ingresos del mes")).toBe("—");
  });

  it("shows the empty state when a draft has neither auto_data nor snapshot", () => {
    renderDetail(baseReport);

    expect(screen.getByText("No hay datos disponibles para este período.")).toBeInTheDocument();
  });

  it("says the preview failed instead of showing a no-data state", () => {
    renderDetail(baseReport, { previewFailed: true });

    expect(screen.queryByText("No hay datos disponibles para este período.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});

describe("ReportDetailClient actions", () => {
  it("generates a draft", async () => {
    api.generate.mockResolvedValueOnce({ queued: false, report: { ...baseReport, status: "generated" } });
    renderDetail(baseReport);

    fireEvent.click(screen.getByRole("button", { name: "Generar reporte" }));

    await waitFor(() => expect(api.generate).toHaveBeenCalledWith(baseReport.report_id));
    expect(api.regenerate).not.toHaveBeenCalled();
  });

  it("offers PDF, send and regenerate for a generated report, and regenerates from the menu", async () => {
    api.regenerate.mockResolvedValueOnce({ queued: false, report: generated });
    renderDetail(generated);

    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar al campo…" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Acciones de/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Re-generar" }));

    await waitFor(() => expect(api.regenerate).toHaveBeenCalledWith(generated.report_id));
    expect(api.generate).not.toHaveBeenCalled();
  });

  it("only downloads a sent report (no generate, regenerate, send or duplicate PDF button)", () => {
    renderDetail({ ...generated, status: "submitted" });

    expect(screen.getAllByRole("button", { name: /PDF/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Generar reporte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar al campo…" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acciones de/ })).not.toBeInTheDocument();
  });
});

describe("ReportDetailClient queued (202) jobs", () => {
  const queued = { queued: true as const, reportId: generated.report_id, status: "generated" };

  async function regenerate() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Acciones de/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Re-generar" }));
  }

  it("shows a pending toast, polls until pdf_generated_at changes and toasts success", async () => {
    const updated = { ...generated, pdf_generated_at: "2026-11-07T09:00:00.000Z" };
    api.regenerate.mockResolvedValueOnce(queued);
    api.waitFor.mockResolvedValueOnce(updated);
    renderDetail(generated);

    await regenerate();
    await waitFor(() => expect(api.toastSuccess).toHaveBeenCalled());

    expect(api.toastLoading).toHaveBeenCalledWith(
      "Regenerando reporte…",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(api.toastSuccess).toHaveBeenCalledWith(
      "Reporte regenerado. El PDF se actualizó.",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(api.refresh).toHaveBeenCalled();

    // The poll predicate only resolves once pdf_generated_at differs.
    const isDone = api.waitFor.mock.calls[0]![1] as (r: MonthlyReport) => boolean;
    expect(isDone(generated)).toBe(false);
    expect(isDone(updated)).toBe(true);
  });

  it("tells the user, with a toast, when polling times out", async () => {
    api.regenerate.mockResolvedValueOnce(queued);
    api.waitFor.mockResolvedValueOnce(null);
    renderDetail(generated);

    await regenerate();
    await waitFor(() => expect(api.toastError).toHaveBeenCalled());

    expect(api.toastError.mock.calls[0]![0]).toMatch(/sigue procesándose/);
    expect(api.toastSuccess).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it("polls generate until the status leaves draft", async () => {
    const done = { ...baseReport, status: "generated" as const };
    api.generate.mockResolvedValueOnce({ ...queued, status: "draft" });
    api.waitFor.mockResolvedValueOnce(done);
    renderDetail(baseReport);

    fireEvent.click(screen.getByRole("button", { name: "Generar reporte" }));
    await waitFor(() => expect(api.toastSuccess).toHaveBeenCalled());

    expect(api.toastLoading).toHaveBeenCalledWith("Generando reporte…", expect.anything());
    const isDone = api.waitFor.mock.calls[0]![1] as (r: MonthlyReport) => boolean;
    expect(isDone(baseReport)).toBe(false);
    expect(isDone(done)).toBe(true);
  });
});

describe("ReportDetailClient send to field confirmation", () => {
  async function openConfirm() {
    fireEvent.click(screen.getByRole("button", { name: "Enviar al campo…" }));
    return screen.findByRole("alertdialog");
  }

  it("asks for confirmation naming club, club type and period before sending", async () => {
    renderDetail(generated);

    const dialog = await openConfirm();
    expect(api.submit).not.toHaveBeenCalled();
    expect(within(dialog).getByText("¿Enviar el informe al campo?")).toBeInTheDocument();
    expect(dialog.textContent).toContain("Club Orión (Aventureros)");
    expect(dialog.textContent).toContain("Octubre 2026");
  });

  it("does not send when the confirmation is cancelled", async () => {
    renderDetail(generated);

    const dialog = await openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.submit).not.toHaveBeenCalled();
  });

  it("submits only after the user confirms", async () => {
    api.submit.mockResolvedValueOnce({ ...generated, status: "submitted" });
    renderDetail(generated);

    const dialog = await openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar al campo" }));

    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(generated.report_id));
    await waitFor(() => expect(api.toastSuccess).toHaveBeenCalledWith("Reporte enviado al campo."));
  });

  it("keeps the confirmation open and says why when the send fails", async () => {
    api.submit.mockRejectedValueOnce(new Error("El informe ya fue enviado."));
    renderDetail(generated);

    const dialog = await openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar al campo" }));

    expect(await within(dialog).findByText("El informe ya fue enviado.")).toBeInTheDocument();
  });

  it("falls back to a period-only message when the API sends no club info", async () => {
    renderDetail({ ...generated, club_enrollment: null });

    const dialog = await openConfirm();
    expect(dialog.textContent).toContain("Se enviará el informe de Octubre 2026 al campo.");
  });
});
