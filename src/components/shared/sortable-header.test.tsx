import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { SortableHeader, getNodeText } from "./sortable-header";

const messages = {
  shared: {
    sortable: {
      sortBy: "Ordenar por {field}",
      sortedAscending: "Ordenado por {field} ascendente. Click para invertir.",
      sortedDescending: "Ordenado por {field} descendente. Click para invertir.",
    },
  },
};

function renderHeader(props: Partial<React.ComponentProps<typeof SortableHeader<string>>> = {}) {
  const onSort = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SortableHeader field="role_category" onSort={onSort} {...props}>
        {props.children ?? "Categoría"}
      </SortableHeader>
    </NextIntlClientProvider>,
  );
  return onSort;
}

describe("SortableHeader aria-label", () => {
  afterEach(cleanup);

  it("uses the visible children text instead of the internal field key", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Ordenar por Categoría" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /role_category/ })).toBeNull();
  });

  it("prefers the explicit label prop", () => {
    renderHeader({ label: "Tipo de rol", children: <span>Cat.</span> });
    expect(screen.getByRole("button", { name: "Ordenar por Tipo de rol" })).toBeInTheDocument();
  });

  it("extracts text from non-string children", () => {
    renderHeader({ children: <><span>Pts</span> <strong>Max</strong></> });
    expect(screen.getByRole("button", { name: "Ordenar por Pts Max" })).toBeInTheDocument();
  });

  it("uses the label in the sorted states too", () => {
    renderHeader({ activeField: "role_category", direction: "asc" });
    expect(
      screen.getByRole("button", { name: "Ordenado por Categoría ascendente. Click para invertir." }),
    ).toBeInTheDocument();
  });

  it("falls back to the field key only when no text is available", () => {
    renderHeader({ children: <svg aria-hidden="true" /> });
    expect(screen.getByRole("button", { name: "Ordenar por role_category" })).toBeInTheDocument();
  });

  it("still calls onSort with the field key", () => {
    const onSort = renderHeader();
    fireEvent.click(screen.getByRole("button"));
    expect(onSort).toHaveBeenCalledWith("role_category", "asc");
  });
});

describe("getNodeText", () => {
  it("handles primitives and nesting", () => {
    expect(getNodeText(["A", 1, null, <b key="b">B</b>])).toBe("A1B");
  });
});
