import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { ScopePicker } from "./scope-picker";

const messages = {
  shared: {
    kit: {
      scope: { label: "Alcance", search: "Buscar club", empty: "Sin resultados", all: "Todos los clubes", change: "Cambiar alcance" },
    },
  },
};

const options = [
  { id: "1", name: "Orión", hint: "Conquistadores", group: "Zona norte" },
  { id: "2", name: "Sirio", group: "Zona sur" },
];

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

beforeAll(() => {
  // cmdk / radix popper need these in jsdom
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= vi.fn();
});

describe("ScopePicker", () => {
  afterEach(cleanup);

  it("shows the all label when nothing is selected", () => {
    wrap(<ScopePicker options={options} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Cambiar alcance" })).toHaveTextContent("Todos los clubes");
  });

  it("shows the selected name and level", () => {
    wrap(<ScopePicker value={{ id: "1", name: "Orión", level: "Zona norte" }} options={options} onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: "Cambiar alcance" });
    expect(btn).toHaveTextContent("Orión");
    expect(btn).toHaveTextContent("Zona norte");
  });

  it("opens, lists grouped options and reports selection", () => {
    const onChange = vi.fn();
    wrap(<ScopePicker options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar alcance" }));
    expect(screen.getByPlaceholderText("Buscar club")).toBeInTheDocument();
    expect(screen.getByText("Zona norte")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Sirio"));
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("selecting all reports null", () => {
    const onChange = vi.fn();
    wrap(<ScopePicker value={{ id: "1", name: "Orión" }} options={options} onChange={onChange} allLabel="Todos" />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar alcance" }));
    fireEvent.click(screen.getByText("Todos"));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
