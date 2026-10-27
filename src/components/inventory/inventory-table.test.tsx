import React from "react";
import { afterEach, describe, expect, it } from "vitest";
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

function renderTable(items: InventoryItem[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventoryTable items={items} />
    </NextIntlClientProvider>,
  );
}

// "Ver detalles" lives in the row-actions menu.
async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Acciones de Carpa" }));
  await user.click(
    await screen.findByRole("menuitem", { name: messages.inventory.actions.view_details }),
  );
}

describe("InventoryTable condition and detail", () => {
  afterEach(() => cleanup());

  it("renders a condition badge per row with the matching variant", () => {
    renderTable([
      { ...BASE, inventory_id: 1, name: "A", condition: "bueno" },
      { ...BASE, inventory_id: 2, name: "B", condition: "regular" },
      { ...BASE, inventory_id: 3, name: "C", condition: "malo" },
      { ...BASE, inventory_id: 4, name: "D" },
    ]);

    expect(
      screen.getByRole("columnheader", { name: messages.inventory.table.col_condition }),
    ).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    const badge = (row: HTMLElement, text: string) => within(row).getByText(text);

    expect(badge(rows[0]!, "Bueno")).toHaveAttribute("data-variant", "success");
    expect(badge(rows[1]!, "Regular")).toHaveAttribute("data-variant", "warning");
    expect(badge(rows[2]!, "Malo")).toHaveAttribute("data-variant", "destructive");
    // Items without a condition fall back to the default.
    expect(badge(rows[3]!, "Bueno")).toHaveAttribute("data-variant", "success");
  });

  it("opens a read-only detail dialog with the extended fields", async () => {
    const user = userEvent.setup();
    renderTable([
      {
        ...BASE,
        condition: "regular",
        serial_number: "SN-001",
        purchase_date: "2024-03-15",
        estimated_value: 1250.5,
        location: "Bodega del club",
        assigned_to: "Juan Pérez",
        notes: "Revisar costuras",
      },
    ]);

    await openDetail(user);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("SN-001")).toBeInTheDocument();
    expect(within(dialog).getByText("Bodega del club")).toBeInTheDocument();
    expect(within(dialog).getByText("Juan Pérez")).toBeInTheDocument();
    expect(within(dialog).getByText("Revisar costuras")).toBeInTheDocument();
    expect(within(dialog).getByText(/1,?250\.50/)).toBeInTheDocument();
    expect(within(dialog).getByText(/2024/)).toBeInTheDocument();
  });

  it("shows a placeholder for empty extended fields", async () => {
    const user = userEvent.setup();
    renderTable([{ ...BASE }]);

    await openDetail(user);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getAllByText(messages.inventory.detail.no_value).length,
    ).toBeGreaterThanOrEqual(6);
  });
});
