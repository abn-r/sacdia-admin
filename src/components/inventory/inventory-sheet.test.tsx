import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InventoryHistoryEntry, InventoryItem } from "@/lib/api/inventory";
import { InventorySheet, type InventorySheetTab } from "./inventory-sheet";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockHistory = vi.fn();
vi.mock("@/lib/api/inventory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/inventory")>();
  return { ...actual, getInventoryHistory: (...args: unknown[]) => mockHistory(...args) };
});

const ITEM: InventoryItem = {
  inventory_id: 5,
  name: "Carpa",
  inventory_category_id: 1,
  inventory_category: { inventory_category_id: 1, name: "Equipamiento" },
  club_id: 1,
  amount: 2,
  active: true,
  condition: "regular",
  serial_number: "SN-001",
  location: "Bodega del club",
};

const ENTRIES: InventoryHistoryEntry[] = [
  {
    history_id: 1,
    inventory_id: 5,
    action: "UPDATE",
    field_changed: "amount",
    old_value: "3",
    new_value: "2",
    performed_by: { name: "Lucía", paternal_last_name: "Mora" },
    created_at: "2026-11-02T15:00:00.000Z",
  },
  {
    history_id: 2,
    inventory_id: 5,
    action: "CREATE",
    field_changed: null,
    old_value: null,
    new_value: null,
    performed_by: null,
    created_at: "2026-10-01T15:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockHistory.mockResolvedValue(ENTRIES);
});
afterEach(cleanup);

function renderSheet(tab: InventorySheetTab = "detail", onTabChange = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventorySheet item={ITEM} tab={tab} onTabChange={onTabChange} onOpenChange={vi.fn()} />
    </NextIntlClientProvider>,
  );
}

describe("InventorySheet", () => {
  it("shows detail and history as two tabs of one sheet", async () => {
    const onTabChange = vi.fn();
    const user = userEvent.setup();
    renderSheet("detail", onTabChange);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("tab", { name: "Detalle" })).toBeInTheDocument();
    expect(within(dialog).getByText("SN-001")).toBeInTheDocument();
    expect(within(dialog).getByText("Bodega del club")).toBeInTheDocument();
    expect(mockHistory).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("tab", { name: "Historial" }));
    expect(onTabChange).toHaveBeenCalledWith("history");
  });

  it("writes each change as before → after, with who and when", async () => {
    renderSheet("history");

    expect(await screen.findByText("Lucía Mora", { exact: false })).toBeInTheDocument();
    expect(mockHistory).toHaveBeenCalledWith(5);

    const line = screen.getByText(messages.inventory.history.field_amount).closest("p")!;
    expect(line).toHaveTextContent(/3.*→.*2/);
    // The creation line has no field and falls back to the action label.
    expect(screen.getByText(messages.inventory.history.action_create)).toBeInTheDocument();
    expect(screen.getByText(messages.inventory.history.performed_by_system, { exact: false })).toBeInTheDocument();
  });

  it("does not draw colored icon circles around history lines", async () => {
    renderSheet("history");
    await screen.findByText("Lucía Mora", { exact: false });

    const list = screen.getByRole("list");
    expect(list.querySelector("svg")).toBeNull();
    expect(list.innerHTML).not.toContain("rounded-full");
  });

  it("shows an error with retry instead of an empty history", async () => {
    mockHistory.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderSheet("history");

    expect(await screen.findByText(messages.inventory.errors.load_history_failed)).toBeInTheDocument();
    expect(screen.queryByText(messages.inventory.history.empty)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    await waitFor(() => expect(mockHistory).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Lucía Mora", { exact: false })).toBeInTheDocument();
  });
});
