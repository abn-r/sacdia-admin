import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MonthlyReport } from "./monthly-report";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// getByLabelText (and getByRole with a name on form controls) read jsdom's
// HTMLInputElement.labels, which walks the whole tree per input. With ~200
// inputs that costs seconds and times out under full-suite load, so resolve
// controls from their <label htmlFor> instead.
function getControlsByLabel(text: string) {
  return screen.getAllByText(text, { selector: "label" }).map((label) => {
    const control = document.getElementById((label as HTMLLabelElement).htmlFor);
    expect(control).not.toBeNull();
    return control as HTMLInputElement;
  });
}

describe("MonthlyReport", () => {
  it("renders the complete semantic document in exactly two document pages", () => {
    render(<MonthlyReport />);

    expect(screen.getAllByRole("heading", { name: "REPORTE MENSUAL" })).toHaveLength(2);
    expect(screen.getByRole("article", { name: "Página 1 de 2" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Página 2 de 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Honores / Especialidades / Clases" }))
      .toHaveTextContent("Participantes");
    expect(screen.getAllByRole("radio")).toHaveLength(26);
  });

  it("keeps repeated header fields synchronized between both printed pages", () => {
    render(<MonthlyReport />);

    const districtFields = getControlsByLabel("Distrito");
    expect(districtFields).toHaveLength(2);
    fireEvent.change(districtFields[0], { target: { value: "Distrito Central" } });

    expect(districtFields[0]).toHaveValue("Distrito Central");
    expect(districtFields[1]).toHaveValue("Distrito Central");
  });

  it("opens the native print dialog only from the screen control", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: print });

    render(<MonthlyReport />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / Guardar PDF" }));

    expect(print).toHaveBeenCalledOnce();
  });
});
