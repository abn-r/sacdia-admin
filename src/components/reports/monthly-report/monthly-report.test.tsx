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
    const { container } = render(<MonthlyReport />);

    const pages = container.querySelectorAll("article[aria-label]");
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveAttribute("aria-label", "Página 1 de 2");
    expect(pages[1]).toHaveAttribute("aria-label", "Página 2 de 2");

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(2);
    headings.forEach((heading) => expect(heading).toHaveTextContent("REPORTE MENSUAL"));

    const tables = container.querySelectorAll("table");
    expect(tables).toHaveLength(5);
    const honorsTable = Array.from(tables).find(
      (table) => table.caption?.textContent === "Honores / Especialidades / Clases",
    );
    expect(honorsTable).toHaveTextContent("Participantes");
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(26);
  });

  it("keeps repeated header fields synchronized between both printed pages", () => {
    const { container } = render(<MonthlyReport />);

    const districtFields = [1, 2].map((page) => {
      const field = container.querySelector<HTMLInputElement>(
        `#monthly-report-meta-page-${page}-distrito`,
      );
      expect(field).not.toBeNull();
      return field as HTMLInputElement;
    });
    districtFields.forEach((field) => expect(field).toHaveAccessibleName("Distrito"));
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
