import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { YearEndClientPage } from "@/components/year-end/year-end-client-page";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";
import messages from "../../../messages/es.json";

const { getYearEndPreview, closeYear } = vi.hoisted(() => ({
  getYearEndPreview: vi.fn(),
  closeYear: vi.fn(),
}));

vi.mock("@/lib/api/year-end", () => ({ getYearEndPreview, closeYear }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const years = [
  { ecclesiastical_year_id: 2, name: "2027", active: false },
  { ecclesiastical_year_id: 1, name: "2026", active: true },
  { ecclesiastical_year_id: 3, name: "2025", active: false },
] as EcclesiasticalYear[];

function renderPage(list: EcclesiasticalYear[] = years) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <YearEndClientPage ecclesiasticalYears={list} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  getYearEndPreview.mockResolvedValue({
    yearId: 1,
    yearActive: true,
    enrollmentsToClose: 2,
    foldersToClose: 1,
    reportsToGenerate: 0,
    enrollmentDetails: [
      { club_enrollment_id: "e1", clubName: "ACV", clubType: "Conquistadores", currentStatus: "active" },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("YearEndClientPage", () => {
  it("only offers the active year", async () => {
    renderPage();

    expect(screen.getByText("Año activo: 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    expect(getYearEndPreview).toHaveBeenCalledWith(1);
  });

  it("shows the real impact and repeats it in the confirmation", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(await screen.findByText("Inscripciones que se cerrarán")).toBeInTheDocument();
    expect(screen.getByText("ACV")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar año" }));
    expect(
      await screen.findByText(
        "Se cerrarán 2 inscripciones, se archivará 1 carpeta y se generarán 0 reportes. Esta acción es irreversible.",
      ),
    ).toBeInTheDocument();
  });

  it("explains when there is no active year", () => {
    renderPage(years.map((year) => ({ ...year, active: false })));

    expect(screen.getByText("No hay un año activo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vista previa" })).toBeNull();
  });
});
