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
  push: vi.fn(),
  refresh: vi.fn(),
  submit: vi.fn(),
  generate: vi.fn(),
  download: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: api.push, refresh: api.refresh }),
  usePathname: () => "/dashboard/reports",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({
  toast: {
    success: api.toastSuccess,
    error: api.toastError,
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock("@/lib/api/monthly-reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/monthly-reports")>();
  return {
    ...actual,
    submitReport: api.submit,
    generateReport: api.generate,
    triggerMonthlyReportPdfDownload: api.download,
  };
});

import { MonthlyClubList } from "./monthly-club-list";

function report(overrides: Partial<MonthlyReport>): MonthlyReport {
  return {
    report_id: "r1",
    enrollment_id: "e1",
    month: 10,
    year: 2026,
    status: "submitted",
    generated_at: "2026-11-06T16:14:00.000Z",
    submitted_at: "2026-11-07T10:00:00.000Z",
    ...overrides,
  };
}

const REPORTS = [
  report({ report_id: "r3", month: 11, status: "draft", generated_at: null, submitted_at: null }),
  report({ report_id: "r2", month: 10, status: "generated", submitted_at: null }),
  report({ report_id: "r1", month: 9 }),
];

function renderList(props: Partial<React.ComponentProps<typeof MonthlyClubList>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MonthlyClubList
        reports={REPORTS}
        searchParams={{ year: "2026" }}
        currentYear={2026}
        clubLabel="Club Orión (Aventureros)"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

function desktopRow(period: string) {
  const link = screen.getAllByRole("link", { name: period }).find((a) => a.closest("table"));
  const row = link?.closest("tr");
  if (!row) throw new Error(`row ${period} not found`);
  return row as HTMLElement;
}

async function openRowMenu(row: HTMLElement) {
  await userEvent.setup().click(within(row).getByRole("button", { name: /Acciones de/ }));
}

describe("MonthlyClubList", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("marks Borrador and Por enviar and leaves Enviado as plain text", () => {
    renderList();

    expect(within(desktopRow("Noviembre 2026")).getByText("Borrador").closest("[data-slot=badge]")).not.toBeNull();
    expect(within(desktopRow("Octubre 2026")).getByText("Por enviar").closest("[data-slot=badge]")).not.toBeNull();
    expect(within(desktopRow("Septiembre 2026")).getByText("Enviado").closest("[data-slot=badge]")).toBeNull();
  });

  it("asks before sending from the list and sends only after the confirmation", async () => {
    api.submit.mockResolvedValueOnce({ ...REPORTS[1], status: "submitted" });
    renderList();

    await openRowMenu(desktopRow("Octubre 2026"));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Enviar al campo…" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(api.submit).not.toHaveBeenCalled();
    expect(within(dialog).getByText("¿Enviar el informe al campo?")).toBeInTheDocument();
    expect(dialog.textContent).toContain("Club Orión (Aventureros)");
    expect(dialog.textContent).toContain("Octubre 2026");

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar al campo" }));

    await waitFor(() => expect(api.submit).toHaveBeenCalledWith("r2"));
    await waitFor(() => expect(api.refresh).toHaveBeenCalled());
    expect(api.toastSuccess).toHaveBeenCalled();
  });

  it("does not send when the confirmation is cancelled", async () => {
    renderList();

    await openRowMenu(desktopRow("Octubre 2026"));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Enviar al campo…" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.submit).not.toHaveBeenCalled();
  });

  it("keeps the confirmation open and says why when the send fails", async () => {
    api.submit.mockRejectedValueOnce(new Error("El campo ya no recibe informes de octubre."));
    renderList();

    await openRowMenu(desktopRow("Octubre 2026"));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Enviar al campo…" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar al campo" }));

    expect(await within(dialog).findByText("El campo ya no recibe informes de octubre.")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("offers no send for a draft or an already sent report", async () => {
    renderList();

    await openRowMenu(desktopRow("Noviembre 2026"));
    expect(await screen.findByRole("menuitem", { name: "Generar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Enviar al campo…" })).not.toBeInTheDocument();
  });

  it("shows the failure inside the table, never as an empty list", () => {
    renderList({ reports: null, error: { kind: "rateLimited" } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Período" })).toBeInTheDocument();
    expect(screen.queryByText("Sin reportes")).not.toBeInTheDocument();
  });

  it("writes the year filter to the URL", () => {
    renderList();

    fireEvent.click(screen.getByLabelText("Año"));
    fireEvent.click(screen.getByRole("option", { name: "Todos los años" }));

    expect(api.push).toHaveBeenCalledWith("/dashboard/reports?year=all");
  });
});
