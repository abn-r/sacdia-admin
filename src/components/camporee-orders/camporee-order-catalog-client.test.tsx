/**
 * Catalog create must send a geography owner id for platform admin.
 * Super-admin / admin-without-territory resolve to `{ level: "all" }` and
 * POST /camporee-order-products 422s without owner_*_id.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AuthUser } from "@/lib/auth/types";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

const mocks = vi.hoisted(() => ({
  user: null as AuthUser | null,
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  listDivisions: vi.fn(),
  listUnions: vi.fn(),
  listLocalFields: vi.fn(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    isLoading: false,
    refresh: async () => {},
  }),
}));

vi.mock("@/lib/api/camporee-orders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/camporee-orders")>();
  return {
    ...original,
    listCamporeeOrderProducts: (...args: unknown[]) =>
      mocks.listProducts(...args),
    createCamporeeOrderProduct: (...args: unknown[]) =>
      mocks.createProduct(...args),
    updateCamporeeOrderProduct: (...args: unknown[]) =>
      mocks.updateProduct(...args),
  };
});

vi.mock("@/lib/api/geography", () => ({
  listDivisions: (...args: unknown[]) => mocks.listDivisions(...args),
  listUnions: (...args: unknown[]) => mocks.listUnions(...args),
  listLocalFields: (...args: unknown[]) => mocks.listLocalFields(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CamporeeOrderCatalogClient } from "@/components/camporee-orders/camporee-order-catalog-client";

const catalog = messages.camporee_orders.catalog;

const SUPER_ADMIN: AuthUser = {
  id: "admin-1",
  email: "admin@test.com",
  roles: ["super-admin"],
  authorization: {
    effective: { permissions: ["camporee-orders:catalog-manage"] },
  },
};

const DIVISION_ADMIN: AuthUser = {
  id: "dia-1",
  email: "dia@test.com",
  roles: ["director-dia"],
  authorization: {
    effective: {
      permissions: ["camporee-orders:catalog-manage"],
      scope: {
        global: { division: { id: 4, name: "Interamericana" } },
      },
    },
  },
};

function renderCatalog() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeOrderCatalogClient />
    </NextIntlClientProvider>,
  );
}

async function openCreateDialog() {
  await screen.findByText(catalog.empty);
  await userEvent.click(
    screen.getByRole("button", { name: catalog.createProduct }),
  );
  await screen.findByRole("heading", { name: catalog.createTitle });
}

describe("CamporeeOrderCatalogClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = SUPER_ADMIN;
    mocks.listProducts.mockResolvedValue([]);
    mocks.createProduct.mockResolvedValue({ camporee_order_product_id: "p1" });
    mocks.updateProduct.mockResolvedValue({});
    mocks.listDivisions.mockResolvedValue([
      { division_id: 4, name: "Interamericana", active: true },
    ]);
    mocks.listUnions.mockResolvedValue([
      { union_id: 8, name: "Unión Mexicana", country_id: 1, active: true },
    ]);
    mocks.listLocalFields.mockResolvedValue([
      { local_field_id: 7, name: "Campo Norte", union_id: 8, active: true },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("asks platform admin for owner territory and posts owner_division_id", async () => {
    renderCatalog();
    await openCreateDialog();

    await waitFor(() => {
      expect(mocks.listDivisions).toHaveBeenCalled();
    });

    expect(
      screen.getByLabelText(catalog.fieldOwnerScope),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(catalog.fieldOwnerTerritory),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(catalog.fieldTitle),
      "Playera evento",
    );

    const save = screen.getByRole("button", { name: catalog.save });
    expect(save).toBeDisabled();

    await userEvent.click(screen.getByLabelText(catalog.fieldOwnerTerritory));
    await userEvent.click(
      await screen.findByRole("option", { name: "Interamericana" }),
    );

    await waitFor(() => {
      expect(save).not.toBeDisabled();
    });
    await userEvent.click(save);

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith({
        title: "Playera evento",
        size_scheme: "LETTER",
        owner_scope: "DIVISION",
        owner_division_id: 4,
      });
    });
  });

  it("does not show owner picks for a locked division actor", async () => {
    mocks.user = DIVISION_ADMIN;
    renderCatalog();
    await openCreateDialog();

    expect(mocks.listDivisions).not.toHaveBeenCalled();
    expect(
      screen.queryByLabelText(catalog.fieldOwnerScope),
    ).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(catalog.fieldTitle),
      "Playera evento",
    );
    await userEvent.click(screen.getByRole("button", { name: catalog.save }));

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith({
        title: "Playera evento",
        size_scheme: "LETTER",
        owner_scope: "DIVISION",
        owner_division_id: 4,
      });
    });
  });
});
