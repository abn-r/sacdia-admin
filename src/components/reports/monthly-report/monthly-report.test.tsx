import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MonthlyReport } from "./monthly-report";
import { createExampleMonthlyReportData } from "./monthly-report.types";
import { shouldUseMonthlyReportExample } from "../../../app/(printable)/reports/monthly-preview/page";

const monthlyReportStyles = readFileSync(
  resolve(process.cwd(), "src/components/reports/monthly-report/monthly-report.module.css"),
  "utf8",
);

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
    expect(pageOne.closest("main")).toHaveAttribute("data-print-root");
    expect(pageOne.closest("main")).toHaveAttribute("data-print-pages", "3");
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
  }, 15_000);

  it("keeps repeated header fields synchronized across all printed pages", () => {
    render(<MonthlyReport />);

    const districtFields = screen.getAllByLabelText("Distrito") as HTMLInputElement[];
    fireEvent.change(districtFields[0], { target: { value: "Distrito Central" } });

    expect(districtFields[0]).toHaveValue("Distrito Central");
    expect(districtFields).toHaveLength(3);
    expect(districtFields[1]).toHaveValue("Distrito Central");
    expect(districtFields[2]).toHaveValue("Distrito Central");
  }, 15_000);

  it("renders representative values from the populated example", () => {
    render(<MonthlyReport initialData={createExampleMonthlyReportData()} />);

    expect(screen.getAllByDisplayValue("Distrito Central")).toHaveLength(3);
    expect(screen.getAllByDisplayValue("Club Centinelas del Valle")).toHaveLength(3);
    expect(screen.getByDisplayValue("Campaña de recolección")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Visita al asilo municipal")).toBeInTheDocument();
  }, 15_000);

  it("opens the native print dialog only from the screen control", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: print });

    render(<MonthlyReport />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / Guardar PDF" }));

    expect(print).toHaveBeenCalledOnce();
  });

  it("uses neutral metric borders and avoids negative layout offsets", () => {
    const metricCardRule = monthlyReportStyles.match(/\.metricCard\s*\{([^}]*)\}/)?.[1] ?? "";
    const tableCellRule = [
      ...monthlyReportStyles.matchAll(/\.reportTable td\s*\{([^}]*)\}/g),
    ].at(-1)?.[1] ?? "";

    expect(metricCardRule).toContain("border: 0.25mm solid var(--sac-border)");
    expect(metricCardRule).not.toContain("border-left");
    expect(tableCellRule).toContain("height: 5.4mm");
    expect(monthlyReportStyles).toContain(".pageTwo .pageContent {\n  gap: 6mm;");
    expect(monthlyReportStyles).toContain(
      ':global(body:has([data-print-root][data-print-pages="3"]))',
    );
    expect(monthlyReportStyles).not.toMatch(/border-left-color\s*:/);
    expect(monthlyReportStyles).not.toMatch(/margin-(?:top|right|bottom|left)\s*:\s*-/);
  });
});

describe("shouldUseMonthlyReportExample", () => {
  it("enables example data only for the explicit scalar value 1", () => {
    expect(shouldUseMonthlyReportExample(undefined)).toBe(false);
    expect(shouldUseMonthlyReportExample("0")).toBe(false);
    expect(shouldUseMonthlyReportExample("1")).toBe(true);
    expect(shouldUseMonthlyReportExample(["1"])).toBe(false);
  });
});
