import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockDelete = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${values && Object.keys(values).length ? `|${JSON.stringify(values)}` : ""}`,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/materials", () => ({
  deleteProduct: (...args: unknown[]) => mockDelete(...args),
}));

import { ApiError } from "@/lib/api/client";
import type { MaterialProduct } from "@/lib/types/materials";
import { ProductsTable } from "./products-table";

function product(over: Partial<MaterialProduct>): MaterialProduct {
  return {
    id: "p1",
    local_field_id: 1,
    sku: "PAN-CQ-01",
    title: "Pañoleta Conquistadores",
    description: null,
    price_centavos: 8500,
    stock: 140,
    active: true,
    cat: { id: "c1", slug: "uniforme", label: "Uniforme", icon: null, sort_order: 0 },
    programa: { id: 2, label: "Conquistadores" },
    variants: null,
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("ProductsTable", () => {
  it("marks only the exceptions: sold out and inactive", () => {
    render(
      <ProductsTable
        canManage
        products={[
          product({ id: "a", title: "Libro de clase Amigo", sku: "LIB-AM-01", stock: 5 }),
          product({ id: "b", title: "Insignia Nudos", sku: "INS-NU-01", stock: 0 }),
          product({ id: "c", title: "Cinto con hebilla", sku: "CIN-CQ-02", active: false }),
        ]}
      />,
    );

    // Desktop table: Agotado once, Inactivo once; the normal rows carry no badge.
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("ops.materials.catalog.soldOut")).toHaveLength(1);
    expect(within(table).getAllByText("materials.components.inventoryTable.statusInactive")).toHaveLength(1);
    expect(within(table).queryByText("materials.components.inventoryTable.statusActive")).toBeNull();
  });

  it("links edit to the route modal", async () => {
    render(<ProductsTable canManage products={[product({})]} />);
    const [trigger] = screen.getAllByRole("button", { name: /shared\.uiPrimitives\.rowActions/ });
    await userEvent.click(trigger!);
    const edit = await screen.findByRole("menuitem", { name: "materials.components.inventoryTable.editAriaLabel" });
    expect(edit.closest("a")).toHaveAttribute("href", "/dashboard/materials/catalog/p1/edit");
  });

  it("shows the open-orders message when the backend refuses to deactivate (409)", async () => {
    mockDelete.mockRejectedValueOnce(new ApiError("conflict", 409, null));
    render(<ProductsTable canManage products={[product({})]} />);

    const [trigger] = screen.getAllByRole("button", { name: /shared\.uiPrimitives\.rowActions/ });
    await userEvent.click(trigger!);
    await userEvent.click(await screen.findByRole("menuitem", { name: /deactivate/ }));
    await userEvent.click(await screen.findByRole("button", { name: "ops.materials.catalog.deactivate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ops.materials.catalog.deactivateProduct.openOrders");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("deactivates and refreshes on success", async () => {
    mockDelete.mockResolvedValueOnce({ id: "p1", active: false });
    render(<ProductsTable canManage products={[product({})]} />);

    const [trigger] = screen.getAllByRole("button", { name: /shared\.uiPrimitives\.rowActions/ });
    await userEvent.click(trigger!);
    await userEvent.click(await screen.findByRole("menuitem", { name: /deactivate/ }));
    await userEvent.click(await screen.findByRole("button", { name: "ops.materials.catalog.deactivate" }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockDelete).toHaveBeenCalledWith("p1");
  });

  it("offers no actions without the manage permission", () => {
    render(<ProductsTable canManage={false} products={[product({})]} />);
    expect(screen.queryByRole("button", { name: /shared\.uiPrimitives\.rowActions/ })).toBeNull();
  });
});
