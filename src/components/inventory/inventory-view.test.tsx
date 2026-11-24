import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { InventoryCategory, InventoryItem } from "@/lib/api/inventory";
import { InventoryView } from "./inventory-view";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/inventory",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: () => true }),
}));
vi.mock("@/lib/api/inventory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/inventory")>();
  return { ...actual, getInventoryHistory: vi.fn().mockResolvedValue([]) };
});

const CATEGORIES: InventoryCategory[] = [
  { inventory_category_id: 1, name: "Equipamiento" },
  { inventory_category_id: 2, name: "Materiales" },
];

const item = (id: number, over: Partial<InventoryItem> = {}): InventoryItem => ({
  inventory_id: id,
  name: `Ítem ${id}`,
  inventory_category_id: 1,
  club_id: 1,
  amount: id,
  active: true,
  ...over,
});

afterEach(cleanup);

function renderView(items: InventoryItem[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventoryView items={items} categories={CATEGORIES} contextQuery="club=1&section=2" />
    </NextIntlClientProvider>,
  );
}

describe("InventoryView", () => {
  it("hides inactive items by default and offers «Activo» as a filter", async () => {
    const user = userEvent.setup();
    renderView([item(1), item(2, { active: false })]);

    expect(screen.getAllByText("Ítem 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ítem 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: messages.inventory.table.col_status }));
    await user.click(await screen.findByRole("option", { name: "Inactivos" }));
    expect(screen.getAllByText("Ítem 2").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ítem 1")).not.toBeInTheDocument();
  });

  it("paginates the list", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 25 }, (_, i) => item(i + 1));
    renderView(many);

    expect(screen.queryByText("Ítem 21")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getAllByText("Ítem 21").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ítem 1")).not.toBeInTheDocument();
  });

  it("filters by category and offers to clear the filters when nothing matches", async () => {
    const user = userEvent.setup();
    renderView([item(1)]);

    await user.click(screen.getByRole("combobox", { name: messages.inventory.view.label_category }));
    await user.click(await screen.findByRole("option", { name: "Materiales" }));

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getAllByText("Ítem 1").length).toBeGreaterThan(0);
  });

  it("opens the detail sheet from the row", async () => {
    const user = userEvent.setup();
    renderView([item(1, { serial_number: "SN-77" })]);

    await user.click(screen.getAllByRole("button", { name: "Ítem 1" })[0]!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("SN-77")).toBeInTheDocument();
  });
});
