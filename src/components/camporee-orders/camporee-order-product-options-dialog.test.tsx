import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { CamporeeOrderProduct } from "@/lib/api/camporee-orders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/camporee-orders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporee-orders")>();
  return {
    ...original,
    addCamporeeOrderProductOption: (...a: unknown[]) => mocks.add(...a),
    updateCamporeeOrderProductOption: (...a: unknown[]) => mocks.update(...a),
  };
});

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import { CamporeeOrderProductOptionsDialog } from "@/components/camporee-orders/camporee-order-product-options-dialog";

const o = messages.camporee_orders.catalog.options;

function option(id: string, label: string, sort: number, active = true) {
  return {
    camporee_order_product_option_id: id,
    product_id: "p1",
    label,
    sort_order: sort,
    active,
  };
}

function product(overrides: Partial<CamporeeOrderProduct> = {}): CamporeeOrderProduct {
  return {
    camporee_order_product_id: "p1",
    owner_scope: "LOCAL_FIELD",
    owner_division_id: null,
    owner_union_id: null,
    owner_local_field_id: 7,
    title: "Playera",
    description: null,
    size_scheme: "LETTER",
    club_type_id: null,
    active: true,
    options: [option("o1", "S", 0), option("o2", "M", 1, false)],
    ...overrides,
  };
}

function renderDialog(
  p: CamporeeOrderProduct | null,
  extra: Partial<React.ComponentProps<typeof CamporeeOrderProductOptionsDialog>> = {},
) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeOrderProductOptionsDialog
        product={p}
        canEdit
        onOpenChange={vi.fn()}
        onChanged={onChanged}
        {...extra}
      />
    </NextIntlClientProvider>,
  );
  return { onChanged };
}

describe("CamporeeOrderProductOptionsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.add.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
  });
  afterEach(() => cleanup());

  it("lists options sorted with their state", () => {
    renderDialog(product());
    expect(screen.getByRole("heading", { name: "Tallas de Playera" })).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText(o.inactive)).toBeInTheDocument();
  });

  it("is read-only when the actor cannot edit", () => {
    renderDialog(product(), { canEdit: false });
    expect(screen.getByText(o.readOnly)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: o.add })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("adds a size with the next sort order and refreshes", async () => {
    const { onChanged } = renderDialog(product());
    await userEvent.type(screen.getByLabelText(o.addLabel), "XL");
    await userEvent.click(screen.getByRole("button", { name: o.add }));
    await waitFor(() =>
      expect(mocks.add).toHaveBeenCalledWith("p1", { label: "XL", sort_order: 2 }),
    );
    expect(onChanged).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(o.toasts.added);
  });

  it("rejects non-digit labels for numeric products and duplicates locally", async () => {
    renderDialog(product({ size_scheme: "NUMERIC", options: [option("o1", "10", 0)] }));
    await userEvent.type(screen.getByLabelText(o.addLabel), "M");
    await userEvent.click(screen.getByRole("button", { name: o.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(o.invalidNumeric);

    await userEvent.clear(screen.getByLabelText(o.addLabel));
    await userEvent.type(screen.getByLabelText(o.addLabel), "10");
    await userEvent.click(screen.getByRole("button", { name: o.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(o.duplicateLocal);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("adds only the missing common letter sizes", async () => {
    renderDialog(product({ options: [option("o1", "S", 0), option("o2", "m", 1)] }));
    await userEvent.click(screen.getByRole("button", { name: o.addPresets }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalledTimes(4));
    expect(mocks.add.mock.calls.map((c) => c[1].label)).toEqual(["XS", "L", "XL", "XXL"]);
    // Only common sizes: natural order XS…XXL, existing ones moved too.
    expect(mocks.add.mock.calls.map((c) => c[1].sort_order)).toEqual([1, 4, 5, 6]);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update).toHaveBeenCalledWith("o1", { sort_order: 2 });
    expect(mocks.update).toHaveBeenCalledWith("o2", { sort_order: 3 });
  });

  it("appends common sizes after a product's own sizes", async () => {
    renderDialog(product({ options: [option("o1", "Única", 0), option("o2", "M", 1)] }));
    await userEvent.click(screen.getByRole("button", { name: o.addPresets }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalledTimes(5));
    expect(mocks.add.mock.calls.map((c) => c[1].sort_order)).toEqual([2, 3, 4, 5, 6]);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("shows the backend rejection when renaming a size with orders", async () => {
    mocks.update.mockRejectedValue(
      new ApiError("Unprocessable", 422, { code: "CAMPOREE_ORDER_OPTION_FORBIDDEN" }),
    );
    renderDialog(product());
    await userEvent.click(screen.getByRole("button", { name: "Editar S" }));
    const input = screen.getByLabelText(o.colLabel);
    await userEvent.clear(input);
    await userEvent.type(input, "SM");
    await userEvent.click(screen.getByRole("button", { name: o.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.camporee_orders.errors.optionForbidden,
    );
  });

  it("deactivates through PATCH active:false after confirmation, and reactivates directly", async () => {
    renderDialog(product());
    await userEvent.click(screen.getByRole("button", { name: "Desactivar S" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(mocks.update).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole("button", { name: o.deactivate }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("o1", { active: false }));

    await userEvent.click(screen.getByRole("button", { name: "Activar M" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("o2", { active: true }));
  });

  it("explains products without sizes", () => {
    renderDialog(product({ size_scheme: "NONE", options: [] }));
    expect(screen.getByText(o.noneHint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: o.add })).not.toBeInTheDocument();
  });
});
