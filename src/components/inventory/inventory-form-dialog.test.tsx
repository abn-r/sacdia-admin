/**
 * Integration tests for InventoryFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog calls `createInventoryItem` and `updateInventoryItem` from
 * `@/lib/api/inventory`. Both are client-side functions. We mock the
 * module entirely so no HTTP requests are issued.
 *
 * The Zod schema is built with `buildSchema(tVal)` — a factory inside
 * the component. `NextIntlClientProvider` with the real `messages/es.json`
 * is required so `tVal(...)` can resolve validation message keys.
 *
 * Required props for the dialog:
 *   - `clubId: number`
 *   - `instanceType: InstanceType` ("adv" | "pathf" | "mg")
 *   - `categories: InventoryCategory[]`
 * Tests provide sensible defaults via the renderDialog helper.
 *
 * `amount` default is 0 — valid (min: 0). Only name and category are
 * required to pass for a clean submit (category defaults to categories[0]).
 *
 * Shadcn <Form> sets `aria-invalid="true"` on invalid fields.
 *
 * RTL auto-cleanup:
 * Vitest uses `globals: false`. We explicitly import `cleanup` and call it
 * in `afterEach` to prevent DOM bleed-through between tests.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockCreateInventoryItem = vi.fn();
const mockUpdateInventoryItem = vi.fn();

vi.mock("@/lib/api/inventory", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/inventory")>();
  return {
    ...original,
    createInventoryItem: (clubId: number, data: unknown) =>
      mockCreateInventoryItem(clubId, data),
    updateInventoryItem: (inventoryId: number, data: unknown) =>
      mockUpdateInventoryItem(inventoryId, data),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog";
import type { InventoryItem, InventoryCategory } from "@/lib/api/inventory";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CATEGORIES: InventoryCategory[] = [
  { inventory_category_id: 1, name: "Equipamiento" },
  { inventory_category_id: 2, name: "Materiales" },
];

const STUB_ITEM: InventoryItem = {
  inventory_id: 42,
  name: "Carpas 4 personas",
  description: "Carpas para actividades al aire libre",
  inventory_category_id: 1,
  club_id: 1,
  amount: 5,
  active: true,
};

const inventoryMessages = messages.inventory;
const validationMessages = messages.inventory.validation;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderInventoryDialogOptions {
  item?: InventoryItem | null;
  categories?: InventoryCategory[];
  clubId?: number;
}

function renderDialog({
  item = null,
  categories = STUB_CATEGORIES,
  clubId = 1,
}: RenderInventoryDialogOptions = {}) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventoryFormDialog
        open={true}
        onOpenChange={onOpenChange}
        clubId={clubId}
        instanceType="pathf"
        categories={categories}
        item={item}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenChange, onSuccess, ...utils };
}

async function submitForm() {
  const form = document.querySelector("form")!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InventoryFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInventoryItem.mockResolvedValue({ ...STUB_ITEM });
    mockUpdateInventoryItem.mockResolvedValue({ ...STUB_ITEM });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog with all fields ─────────────────────────────────────

  it("renders dialog title, all fields and submit button", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "Nuevo ítem de inventario" }),
    ).toBeInTheDocument();

    // Name field
    expect(
      screen.getByPlaceholderText(inventoryMessages.placeholders.name),
    ).toBeInTheDocument();

    // Quantity field
    expect(
      screen.getByPlaceholderText(inventoryMessages.placeholders.quantity),
    ).toBeInTheDocument();

    // Category select trigger
    expect(screen.getByText(/Categoría/)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear ítem" })).toBeInTheDocument();
  });

  it("renders edit title and populate fields when item prop is provided", () => {
    renderDialog({ item: STUB_ITEM });

    expect(
      screen.getByRole("heading", { name: "Editar ítem" }),
    ).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    expect(nameInput).toHaveValue(STUB_ITEM.name);

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("shows instanceType label for create mode", () => {
    renderDialog();
    // Shows the label for "pathf" = "Conquistadores"
    expect(screen.getByText("Conquistadores")).toBeInTheDocument();
  });

  // ── 2. Name validation ────────────────────────────────────────────────────

  it("marks name field aria-invalid when submitted empty", async () => {
    renderDialog();

    await submitForm();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await waitFor(() => {
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("shows min-length error when name is less than 3 characters", async () => {
    renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "AB" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });

    expect(
      screen.getByText(validationMessages.name_min.replace("{min}", "3")),
    ).toBeInTheDocument();
  });

  // ── 3. Amount validation — must be integer >= 0 ───────────────────────────

  it("marks amount field aria-invalid when value is negative", async () => {
    renderDialog();

    const amountInput = screen.getByPlaceholderText(inventoryMessages.placeholders.quantity);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "-1" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(amountInput).toHaveAttribute("aria-invalid", "true");
    });

    expect(
      screen.getByText(validationMessages.amount_min),
    ).toBeInTheDocument();
  });

  it("accepts amount of 0 as valid", async () => {
    renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Ítem válido" } });
    });

    const amountInput = screen.getByPlaceholderText(inventoryMessages.placeholders.quantity);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "0" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateInventoryItem).toHaveBeenCalledOnce();
    });

    const [, calledPayload] = mockCreateInventoryItem.mock.calls[0] as [
      number,
      { amount: number },
    ];
    expect(calledPayload.amount).toBe(0);
  });

  // ── 4. Successful create ───────────────────────────────────────────────────

  it("calls createInventoryItem with correct payload and closes on success", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Nuevo ítem de prueba" } });
    });

    const amountInput = screen.getByPlaceholderText(inventoryMessages.placeholders.quantity);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "10" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateInventoryItem).toHaveBeenCalledOnce();
    });

    const [calledClubId, calledPayload] = mockCreateInventoryItem.mock.calls[0] as [
      number,
      { name: string; amount: number; instanceType: string },
    ];
    expect(calledClubId).toBe(1);
    expect(calledPayload.name).toBe("Nuevo ítem de prueba");
    expect(calledPayload.amount).toBe(10);
    expect(calledPayload.instanceType).toBe("pathf");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith(inventoryMessages.toasts.item_created);
  });

  // ── 5. Successful edit ─────────────────────────────────────────────────────

  it("calls updateInventoryItem with correct id and payload on save", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ item: STUB_ITEM });

    const amountInput = screen.getByPlaceholderText(inventoryMessages.placeholders.quantity);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "8" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateInventoryItem).toHaveBeenCalledOnce();
    });

    const [calledId, calledPayload] = mockUpdateInventoryItem.mock.calls[0] as [
      number,
      { amount: number },
    ];
    expect(calledId).toBe(STUB_ITEM.inventory_id);
    expect(calledPayload.amount).toBe(8);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith(inventoryMessages.toasts.item_updated);
  });

  // ── 6. Submit during pending ───────────────────────────────────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveCreate!: () => void;
    mockCreateInventoryItem.mockReturnValue(
      new Promise<void>((res) => {
        resolveCreate = res;
      }),
    );

    renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Ítem en vuelo" } });
    });

    await submitForm();

    expect(screen.getByRole("button", { name: "Creando..." })).toBeDisabled();

    await act(async () => {
      resolveCreate();
    });
  });

  // ── 7. API error response ──────────────────────────────────────────────────

  it("shows error toast when createInventoryItem rejects with Error instance", async () => {
    mockCreateInventoryItem.mockRejectedValue(new Error("Connection refused"));

    renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Ítem con error" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Connection refused");
    });
  });

  it("shows fallback error message when createInventoryItem rejects with non-Error", async () => {
    mockCreateInventoryItem.mockRejectedValue("unknown failure");

    renderDialog();

    const nameInput = screen.getByPlaceholderText(inventoryMessages.placeholders.name);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Ítem fallback" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(inventoryMessages.errors.save_item_failed);
    });
  });

  // ── 8. Cancel closes dialog ────────────────────────────────────────────────

  it("calls onOpenChange(false) when cancel is clicked without calling createInventoryItem", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateInventoryItem).not.toHaveBeenCalled();
  });
});
