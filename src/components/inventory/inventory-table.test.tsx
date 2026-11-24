import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { InventoryTable } from "@/components/inventory/inventory-table";
import type { InventoryItem } from "@/lib/api/inventory";

const BASE: InventoryItem = {
  inventory_id: 1,
  name: "Carpa",
  inventory_category_id: 1,
  inventory_category: { inventory_category_id: 1, name: "Equipamiento" },
  club_id: 1,
  amount: 2,
  active: true,
};

function renderTable(items: InventoryItem[], props: Partial<React.ComponentProps<typeof InventoryTable>> = {}) {
  const onOpen = vi.fn();
  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventoryTable items={items} onOpen={onOpen} {...props} />
    </NextIntlClientProvider>,
  );
  return { onOpen, ...utils };
}

describe("InventoryTable", () => {
  afterEach(() => cleanup());

  it("marks a row only when the condition is Regular or Malo", () => {
    renderTable([
      { ...BASE, inventory_id: 1, name: "A", condition: "bueno" },
      { ...BASE, inventory_id: 2, name: "B", condition: "regular" },
      { ...BASE, inventory_id: 3, name: "C", condition: "malo" },
      { ...BASE, inventory_id: 4, name: "D" },
    ]);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).queryByText("Bueno")).not.toBeInTheDocument();
    expect(within(rows[1]!).getByText("Regular")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Malo")).toBeInTheDocument();
    expect(within(rows[3]!).queryByText("Bueno")).not.toBeInTheDocument();
  });

  it("never marks «Activo» on the row (it is a filter now)", () => {
    renderTable([{ ...BASE }, { ...BASE, inventory_id: 2, name: "Inactiva", active: false }]);

    expect(screen.queryByText(messages.inventory.status.active)).not.toBeInTheDocument();
    expect(screen.queryByText(messages.inventory.status.inactive)).not.toBeInTheDocument();
  });

  it("right-aligns the quantity", () => {
    renderTable([{ ...BASE, amount: 12 }]);

    const cell = screen.getByRole("cell", { name: "12" });
    expect(cell.className).toContain("text-right");
    expect(cell.className).toContain("tabular-nums");
    expect(screen.getByRole("columnheader", { name: messages.inventory.table.col_amount }).className).toContain(
      "text-right",
    );
  });

  it("opens the sheet on the detail tab from the name and on the history tab from the menu", async () => {
    const user = userEvent.setup();
    const { onOpen } = renderTable([{ ...BASE }]);

    await user.click(screen.getAllByRole("button", { name: "Carpa" })[0]!);
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ inventory_id: 1 }), "detail");

    await user.click(screen.getAllByRole("button", { name: "Acciones de Carpa" })[0]!);
    await user.click(await screen.findByRole("menuitem", { name: messages.inventory.actions.view_history }));
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ inventory_id: 1 }), "history");
  });

  it("keeps a two-line list for phones next to the table", () => {
    renderTable([{ ...BASE, condition: "regular" }]);

    const list = screen.getByRole("list", { name: messages.inventory.table.col_name });
    expect(within(list).getByText("Equipamiento")).toBeInTheDocument();
    expect(within(list).getByText("Regular")).toBeInTheDocument();
  });

  it("links edit to the route modal", async () => {
    const user = userEvent.setup();
    renderTable([{ ...BASE }], { editHref: (item) => `/dashboard/inventory/${item.inventory_id}/edit?club=1&section=2` });

    await user.click(screen.getAllByRole("button", { name: "Acciones de Carpa" })[0]!);
    expect(await screen.findByRole("menuitem", { name: messages.inventory.actions.edit_item })).toHaveAttribute(
      "href",
      "/dashboard/inventory/1/edit?club=1&section=2",
    );
  });
});
