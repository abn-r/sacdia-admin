import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MonthlyReport } from "./monthly-report";
import { createExampleMonthlyReportData } from "./monthly-report.types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MonthlyReport", () => {
  it("renders the complete semantic document in exactly three balanced pages", () => {
    render(<MonthlyReport />);

    expect(screen.getAllByRole("heading", { name: "REPORTE MENSUAL" })).toHaveLength(3);

    const pageOne = screen.getByLabelText("Página 1 de 3");
    const pageTwo = screen.getByLabelText("Página 2 de 3");
    const pageThree = screen.getByLabelText("Página 3 de 3");

    expect(pageOne).toBeInTheDocument();
    expect(pageTwo).toBeInTheDocument();
    expect(pageThree).toBeInTheDocument();
    expect(within(pageOne).getByText("ADMINISTRACIÓN")).toBeInTheDocument();
    expect(within(pageOne).getByText("ENSEÑANZAS")).toBeInTheDocument();
    expect(within(pageTwo).getByText("ACTIVIDADES DEL CLUB")).toBeInTheDocument();
    expect(within(pageTwo).getByText("FINANZAS")).toBeInTheDocument();
    expect(within(pageThree).getByText("ACTIVIDAD MISIONERA")).toBeInTheDocument();
    expect(within(pageThree).getByText("SERVICIO")).toBeInTheDocument();
    expect(within(pageThree).getByLabelText("Firmas")).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Honores / Especialidades / Clases" }))
      .toHaveTextContent("Participantes");
    expect(screen.getAllByRole("radio")).toHaveLength(26);
  });

  it("keeps repeated header fields synchronized across all printed pages", () => {
    render(<MonthlyReport />);

    const districtFields = screen.getAllByLabelText("Distrito") as HTMLInputElement[];
    fireEvent.change(districtFields[0], { target: { value: "Distrito Central" } });

    expect(districtFields[0]).toHaveValue("Distrito Central");
    expect(districtFields).toHaveLength(3);
    expect(districtFields[1]).toHaveValue("Distrito Central");
    expect(districtFields[2]).toHaveValue("Distrito Central");
  });

  it("renders representative values from the populated example", () => {
    render(<MonthlyReport initialData={createExampleMonthlyReportData()} />);

    expect(screen.getAllByDisplayValue("Distrito Central")).toHaveLength(3);
    expect(screen.getAllByDisplayValue("Club Centinelas del Valle")).toHaveLength(3);
    expect(screen.getByDisplayValue("Campaña de recolección")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Visita al asilo municipal")).toBeInTheDocument();
  });

  it("opens the native print dialog only from the screen control", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: print });

    render(<MonthlyReport />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / Guardar PDF" }));

    expect(print).toHaveBeenCalledOnce();
  });
});
