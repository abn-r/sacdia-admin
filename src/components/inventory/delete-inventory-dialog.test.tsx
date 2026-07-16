/**
 * Integration tests for DeleteInventoryDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar.
 * On confirm: calls `deleteInventoryItem(item.inventory_id)`, shows
 * success toast, calls onSuccess() and closes the dialog.
 *
 * `deleteInventoryItem` is mocked at module boundary.
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
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
import type { InventoryItem } from "@/lib/api/inventory";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDeleteInventoryItem = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/inventory", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/inventory")>();
  return {
    ...original,
    deleteInventoryItem: (...args: unknown[]) => mockDeleteInventoryItem(...args),
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

import { DeleteInventoryDialog } from "@/components/inventory/delete-inventory-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_ITEM: InventoryItem = {
  inventory_id: 33,
  name: "Tienda de campaña grande",
  description: "Tienda 6 personas",
  inventory_category_id: 1,
  club_id: 10,
  amount: 2,
  active: true,
};

const t = messages.inventory;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  item?: InventoryItem | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, item = STUB_ITEM, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteInventoryDialog
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteInventoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteInventoryItem.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /¿eliminar ítem\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  // ── 2. Shows item name in description ───────────────────────────────────

  it("shows the item name in the description", () => {
    renderDialog({ item: STUB_ITEM });

    expect(screen.getByText(/Tienda de campaña grande/)).toBeInTheDocument();
    expect(screen.getByText(/desactivará el ítem del inventario/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /¿eliminar ítem\?/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null item — early return, no API call ─────────────────────────────

  it("does not call deleteInventoryItem when item is null", async () => {
    renderDialog({ item: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteInventoryItem).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls deleteInventoryItem with inventory_id ──────────

  it("calls deleteInventoryItem with inventory_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ item: STUB_ITEM });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteInventoryItem).toHaveBeenCalledWith(33);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.item_deleted);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteInventoryItem on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteInventoryItem).not.toHaveBeenCalled();
  });

  // ── 7. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error.message when deleteInventoryItem throws", async () => {
    mockDeleteInventoryItem.mockRejectedValue(new Error("Item not found"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Item not found");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when deleteInventoryItem throws a non-Error", async () => {
    mockDeleteInventoryItem.mockRejectedValue({ code: "ECONNRESET" });

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.delete_failed);
    });
  });

  // ── 9. In-flight state — buttons disabled while deleting ─────────────────

  it("disables both buttons while deletion is in flight", async () => {
    let resolveDelete!: () => void;
    mockDeleteInventoryItem.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveDelete = () => res({ ok: true });
      }),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /eliminando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolveDelete();
    });
  });

  // ── 10. onSuccess NOT called on error ────────────────────────────────────

  it("does NOT call onSuccess when deleteInventoryItem fails", async () => {
    mockDeleteInventoryItem.mockRejectedValue(new Error("Server error"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
