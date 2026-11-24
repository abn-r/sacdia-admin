import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const api = vi.hoisted(() => ({ push: vi.fn(), create: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push, refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: api.toastSuccess, error: vi.fn() } }));
vi.mock("@/lib/api/monthly-reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/monthly-reports")>();
  return { ...actual, createOrGetDraftReport: api.create };
});

import { NewMonthlyReportButton } from "./new-monthly-report-button";

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <NewMonthlyReportButton enrollmentId="e1" initialMonth={11} initialYear={2026} />
    </NextIntlClientProvider>,
  );
}

describe("NewMonthlyReportButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("creates the draft for the chosen month and opens it", async () => {
    api.create.mockResolvedValueOnce({ report_id: "r9" });
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo reporte" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Nuevo informe mensual")).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith("e1", 11, 2026));
    await waitFor(() => expect(api.push).toHaveBeenCalledWith("/dashboard/reports/r9"));
  });

  it("keeps the dialog open and says why when the draft cannot be created", async () => {
    api.create.mockRejectedValueOnce(new Error("No hay inscripción activa."));
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo reporte" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear borrador" }));

    expect(await within(dialog).findByText("No hay inscripción activa.")).toBeInTheDocument();
    expect(api.push).not.toHaveBeenCalled();
  });
});
