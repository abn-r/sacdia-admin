/**
 * Integration tests for DeleteTransactionDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * This is an AlertDialog (NOT a form dialog). It has no React Hook Form —
 * it presents a confirmation with two buttons: cancel and confirm-delete.
 *
 * The component calls `deleteFinance(finance.finance_id)` on confirmation.
 * We mock the API module entirely — no fetch path exercised.
 *
 * `useFormatCurrency` is a hook from `@/lib/format-locale` that calls
 * `useLocale` internally (next-intl). Wrapping in NextIntlClientProvider
 * satisfies it.
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
import type { Finance } from "@/lib/api/finances";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix AlertDialog uses ResizeObserver + scrollIntoView)
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
const mockDeleteFinance = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/finances", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/finances")>();
  return {
    ...original,
    deleteFinance: (...args: unknown[]) => mockDeleteFinance(...args),
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

import { DeleteTransactionDialog } from "@/components/finances/delete-transaction-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** amount stored in cents, type 0 = ingreso */
const STUB_INCOME_FINANCE: Finance = {
  finance_id: 42,
  year: 2026,
  month: 5,
  amount: 150000, // 1500.00
  description: "Cuota mensual",
  club_type_id: 1,
  finance_category_id: 3,
  finance_date: "2026-05-01T00:00:00.000Z",
  club_section_id: 7,
  active: true,
  finances_categories: { name: "Cuota", type: 0 },
};

/** type 1 = egreso */
const STUB_EXPENSE_FINANCE: Finance = {
  finance_id: 99,
  year: 2026,
  month: 5,
  amount: 50000, // 500.00
  description: null,
  club_type_id: 1,
  finance_category_id: 5,
  finance_date: "2026-05-10T00:00:00.000Z",
  club_section_id: 7,
  active: true,
  finances_categories: { name: "Materiales", type: 1 },
};

const t = messages.finances;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  finance?: Finance | null;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, finance = STUB_INCOME_FINANCE } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteTransactionDialog
        open={open}
        onOpenChange={onOpenChange}
        finance={finance}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteTransactionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteFinance.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and action buttons ──────────────────────────────────

  it("renders dialog title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: t.delete.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.delete.cancelButton })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.delete.confirmButton })).toBeInTheDocument();
  });

  // ── 2. Shows description with finance amount and description ─────────────

  it("shows amount and description from finance prop in the dialog body", () => {
    renderDialog({ finance: STUB_INCOME_FINANCE });

    // "Cuota mensual" is in the description
    expect(screen.getByText(/cuota mensual/i)).toBeInTheDocument();
    // descriptionPre text is present
    expect(screen.getByText(new RegExp(t.delete.descriptionPre, "i"))).toBeInTheDocument();
    // cannotUndo text is present
    expect(screen.getByText(new RegExp(t.delete.cannotUndo, "i"))).toBeInTheDocument();
  });

  // ── 3. Null finance shows fallback description ───────────────────────────

  it("shows fallback description when finance is null", () => {
    renderDialog({ finance: null });

    expect(screen.getByText(t.delete.descriptionFallback)).toBeInTheDocument();
  });

  // ── 4. Dialog is not in DOM when closed ──────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("heading", { name: t.delete.title })).not.toBeInTheDocument();
  });

  // ── 5. Happy path — calls deleteFinance and closes on confirm ────────────

  it("calls deleteFinance with correct id and triggers onSuccess + onOpenChange on confirm", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: t.delete.confirmButton });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteFinance).toHaveBeenCalledWith(42);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.transaction_deleted);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel button calls onOpenChange(false) without API call ──────────

  it("calls onOpenChange(false) and does NOT call deleteFinance when cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: t.delete.cancelButton }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteFinance).not.toHaveBeenCalled();
  });

  // ── 7. API error — shows error toast, does NOT call onSuccess ────────────

  it("shows error toast and does not call onSuccess when deleteFinance throws", async () => {
    mockDeleteFinance.mockRejectedValue(new Error("Network error"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: t.delete.confirmButton });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.delete_transaction_failed);
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. Confirm button disabled while deletion in flight ──────────────────

  it("disables both cancel and confirm buttons while deletion is in flight", async () => {
    let resolveDelete!: () => void;
    mockDeleteFinance.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveDelete = () => res({ ok: true });
      }),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: t.delete.confirmButton });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.delete.confirmButton })).toBeDisabled();
      expect(screen.getByRole("button", { name: t.delete.cancelButton })).toBeDisabled();
    });

    await act(async () => {
      resolveDelete();
    });
  });

  // ── 9. Income vs expense — strong tag renders with different color class ──

  it("renders income amount inside <strong> for income category type 0", () => {
    renderDialog({ finance: STUB_INCOME_FINANCE });

    // The strong tag should have text-success class for income
    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.className).toContain("text-success");
  });

  it("renders expense amount inside <strong> for expense category type 1", () => {
    renderDialog({ finance: STUB_EXPENSE_FINANCE });

    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.className).toContain("text-destructive");
  });
});
