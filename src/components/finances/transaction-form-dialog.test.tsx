/**
 * Integration tests for TransactionFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog calls `getFinanceCategories`, `createFinance`, and
 * `updateFinance` from `@/lib/api/finances`. All three are client-side
 * functions that call `apiRequest` / `apiRequestFromClient` internally.
 * We mock the entire module with `vi.mock(...)` so no actual HTTP
 * requests are issued — MSW is not involved here.
 *
 * `getFinanceCategories` is called in a useEffect on mount (when open=true).
 * Tests that need categories in the dropdown resolve it with a stub list.
 *
 * Zod schema uses `z.coerce.number()` for numeric fields.  Submitting a
 * form without setting `amount` / `finance_category_id` leaves them as
 * `undefined` — coercion of undefined → NaN, which fails `.positive()` and
 * `.min(1)` checks respectively, triggering FormMessage errors.
 *
 * Shadcn <Form> sets `aria-invalid="true"` on fields that have errors after
 * a submit attempt. We assert on that attribute to lock the primitive's
 * behavior.
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
// jsdom polyfills required by Radix UI components
// ---------------------------------------------------------------------------

// Radix UI's Select component uses ResizeObserver internally.
// jsdom does not implement it — polyfill with a no-op.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Radix UI's Select calls scrollIntoView on the active item when the
// dropdown opens. jsdom does not implement it — polyfill with a no-op.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// ---------------------------------------------------------------------------
// Module-level mocks — Vitest hoists vi.mock() calls before imports resolve.
// ---------------------------------------------------------------------------

const mockGetFinanceCategories = vi.fn();
const mockCreateFinance = vi.fn();
const mockUpdateFinance = vi.fn();

vi.mock("@/lib/api/finances", () => ({
  getFinanceCategories: () => mockGetFinanceCategories(),
  createFinance: (clubId: number, payload: unknown) =>
    mockCreateFinance(clubId, payload),
  updateFinance: (financeId: number, payload: unknown) =>
    mockUpdateFinance(financeId, payload),
}));

// sonner toast — we don't need to render the Toaster; just spy on calls.
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { TransactionFormDialog } from "@/components/finances/transaction-form-dialog";
import type { ClubSection } from "@/components/finances/transaction-form-dialog";
import type { FinanceCategory, Finance } from "@/lib/api/finances";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CATEGORIES: FinanceCategory[] = [
  { finance_category_id: 1, name: "Cuotas", type: 0 },
  { finance_category_id: 2, name: "Material", type: 1 },
];

const STUB_SECTIONS: ClubSection[] = [
  { club_section_id: 10, club_type_id: 1, name: "Conquistadores" },
];

const STUB_FINANCE: Finance = {
  finance_id: 99,
  year: 2025,
  month: 3,
  amount: 5000, // 50.00 in cents
  description: "Cuota mensual",
  club_type_id: 1,
  finance_category_id: 1,
  finance_date: "2025-03-15T00:00:00.000Z",
  club_section_id: 10,
  active: true,
};

const financeMessages = messages.finances;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderDialogOptions {
  finance?: Finance | null;
  sections?: ClubSection[];
  clubId?: number;
}

function renderDialog({
  finance = null,
  sections = STUB_SECTIONS,
  clubId = 1,
}: RenderDialogOptions = {}) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TransactionFormDialog
        open={true}
        onOpenChange={onOpenChange}
        clubId={clubId}
        sections={sections}
        finance={finance}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenChange, onSuccess, ...utils };
}

// Helper: submit the form element
async function submitForm() {
  const form = document.querySelector("form")!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TransactionFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: categories load successfully
    mockGetFinanceCategories.mockResolvedValue(STUB_CATEGORIES);
    // Default: mutations resolve (success path)
    mockCreateFinance.mockResolvedValue({ ...STUB_FINANCE });
    mockUpdateFinance.mockResolvedValue({ ...STUB_FINANCE });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog with all fields ─────────────────────────────────────

  it("renders dialog title, all required fields and submit button", async () => {
    renderDialog();

    // Title
    await screen.findByRole("heading", {
      name: financeMessages.form.titleNew,
    });

    // Key fields
    expect(screen.getByLabelText(/Monto/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument();

    // Submit button
    expect(
      screen.getByRole("button", { name: financeMessages.form.createButton }),
    ).toBeInTheDocument();

    // Cancel button
    expect(
      screen.getByRole("button", { name: financeMessages.form.cancelButton }),
    ).toBeInTheDocument();
  });

  it("renders edit title when a finance prop is provided", async () => {
    renderDialog({ finance: STUB_FINANCE });

    await screen.findByRole("heading", {
      name: financeMessages.form.titleEdit,
    });

    expect(
      screen.getByRole("button", { name: financeMessages.form.saveButton }),
    ).toBeInTheDocument();
  });

  // ── 2. Amount validation ───────────────────────────────────────────────────

  it("shows validation error when amount is empty on submit", async () => {
    renderDialog();

    // Wait for categories to load
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    const amountInput = screen.getByLabelText(/Monto/);
    // Clear the input so it submits empty
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "" } });
    });

    await submitForm();

    // aria-invalid must be set on the amount input
    await waitFor(() => {
      expect(amountInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("shows validation error when amount is zero (must be positive)", async () => {
    renderDialog();
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    const amountInput = screen.getByLabelText(/Monto/);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "0" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(amountInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ── 3. finance_date required ───────────────────────────────────────────────

  it("shows aria-invalid on date field when date is cleared", async () => {
    renderDialog();
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    const dateInput = screen.getByLabelText(/Fecha/);
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: "" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(dateInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ── 4. Successful create ───────────────────────────────────────────────────

  it("calls createFinance with correct payload and closes dialog on success", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSuccess } = renderDialog();

    // Wait for categories to load so SelectContent has items.
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());
    // Flush React state update so category options appear in the DOM.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Set amount via native input
    const amountInput = screen.getByLabelText(/Monto/);
    await user.clear(amountInput);
    await user.type(amountInput, "50");

    // Open the Category select by clicking the SelectTrigger (role=combobox).
    // Radix SelectTrigger renders as role="combobox". The first combobox in
    // the form is the category select.
    const comboboxes = screen.getAllByRole("combobox");
    // Use fireEvent.click — userEvent.click fails due to Radix Dialog setting
    // pointer-events:none on body and SelectValue span having pointer-events:none.
    await act(async () => {
      fireEvent.click(comboboxes[0]!);
    });

    // After click, Radix renders the SelectContent in a portal.
    // Items render as role="option". Find and click "Cuotas".
    const categoryOption = await screen.findByRole("option", { name: /Cuotas/ });
    await act(async () => {
      fireEvent.click(categoryOption);
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateFinance).toHaveBeenCalledOnce();
    });

    // Payload amount should be in cents (50 * 100 = 5000)
    const [calledClubId, calledPayload] = mockCreateFinance.mock.calls[0] as [
      number,
      { amount: number; finance_category_id: number },
    ];
    expect(calledClubId).toBe(1);
    expect(calledPayload.amount).toBe(5000);
    expect(calledPayload.finance_category_id).toBe(1);

    // Dialog closes and success callback fires
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 5. Successful edit ─────────────────────────────────────────────────────

  it("calls updateFinance with correct payload and closes dialog on success", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ finance: STUB_FINANCE });
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    // Update amount to 100
    const amountInput = screen.getByLabelText(/Monto/);
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: "100" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateFinance).toHaveBeenCalledOnce();
    });

    const [calledId, calledPayload] = mockUpdateFinance.mock.calls[0] as [
      number,
      { amount: number },
    ];
    expect(calledId).toBe(STUB_FINANCE.finance_id);
    expect(calledPayload.amount).toBe(10000); // 100 * 100

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Submit during pending ──────────────────────────────────────────────

  it("disables submit button while update submission is in flight", async () => {
    // Use edit mode — finance_category_id is pre-filled, so validation passes immediately.
    let resolveUpdate!: () => void;
    mockUpdateFinance.mockReturnValue(
      new Promise<void>((res) => {
        resolveUpdate = res;
      }),
    );

    renderDialog({ finance: STUB_FINANCE });
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    // Submit with pre-filled data (edit mode has valid defaults from STUB_FINANCE)
    await submitForm();

    // Button text changes to "Guardando..." — check disabled state
    await waitFor(() => {
      const saveBtn = screen.getByRole("button", {
        name: financeMessages.form.saveButton,
      });
      expect(saveBtn).toBeDisabled();
    });

    // Resolve so React can clean up async state
    await act(async () => {
      resolveUpdate();
    });
  });

  // ── 7. API error shows toast ───────────────────────────────────────────────

  it("shows error toast when updateFinance rejects with Error instance", async () => {
    // Use edit mode so validation passes without needing to fill Radix Selects.
    mockUpdateFinance.mockRejectedValue(new Error("Network error"));

    renderDialog({ finance: STUB_FINANCE });
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Network error");
    });
  });

  it("shows fallback error toast when updateFinance rejects with non-Error", async () => {
    mockUpdateFinance.mockRejectedValue("string-rejection");

    renderDialog({ finance: STUB_FINANCE });
    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        financeMessages.errors.update_transaction_failed,
      );
    });
  });

  // ── 8. Cancel closes dialog ────────────────────────────────────────────────

  it("calls onOpenChange(false) when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await waitFor(() => expect(mockGetFinanceCategories).toHaveBeenCalledOnce());

    const cancelBtn = screen.getByRole("button", {
      name: financeMessages.form.cancelButton,
    });
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateFinance).not.toHaveBeenCalled();
  });

  // ── 9. Categories load failure ────────────────────────────────────────────

  it("shows error toast when getFinanceCategories rejects", async () => {
    mockGetFinanceCategories.mockRejectedValue(new Error("Failed"));

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        financeMessages.toasts.categories_load_failed,
      );
    });
  });
});
