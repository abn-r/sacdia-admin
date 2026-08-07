import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MonthlyReport } from "./monthly-report";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MonthlyReport", () => {
  it("renders the complete semantic document in exactly two document pages", () => {
    render(<MonthlyReport />);

    expect(screen.getAllByRole("heading", { name: "REPORTE MENSUAL" })).toHaveLength(2);
    expect(screen.getByLabelText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Honores / Especialidades / Clases" }))
      .toHaveTextContent("Participantes");
    expect(screen.getAllByRole("radio")).toHaveLength(26);
  }, 15_000);

  it("keeps repeated header fields synchronized between both printed pages", () => {
    render(<MonthlyReport />);

    const districtFields = screen.getAllByLabelText("Distrito") as HTMLInputElement[];
    fireEvent.change(districtFields[0], { target: { value: "Distrito Central" } });

    expect(districtFields[0]).toHaveValue("Distrito Central");
    expect(districtFields[1]).toHaveValue("Distrito Central");
  }, 15_000);

  it("opens the native print dialog only from the screen control", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: print });

    render(<MonthlyReport />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / Guardar PDF" }));

    expect(print).toHaveBeenCalledOnce();
  });
});
