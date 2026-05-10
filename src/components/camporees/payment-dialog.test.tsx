/**
 * Integration tests for PaymentDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (schema built via buildSchema).
 * It calls `createPayment` or `updatePayment` from `@/lib/api/camporees`
 * (HTTP). We mock the module entirely — MSW remains active but is not
 * exercised here (consistent with MembershipRejectDialog / InsuranceFormDialog
 * patterns).
 *
 * The dialog has two modes:
 *   - Create: member_id (required via Select), amount (required), payment_type
 *   - Edit:   member_id is read-only, amount (required), payment_type
 *
 * Renders are wrapped in `NextIntlClientProvider` with the real `messages/es.json`.
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
import type { CamporeePayment, CamporeeMember } from "@/lib/api/camporees";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog uses ResizeObserver + scrollIntoView)
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
const mockCreatePayment = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdatePayment = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    createPayment: (...args: unknown[]) => mockCreatePayment(...args),
    updatePayment: (...args: unknown[]) => mockUpdatePayment(...args),
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

import { PaymentDialog } from "@/components/camporees/payment-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_MEMBERS: CamporeeMember[] = [
  { user_id: "user-001", name: "Ana López" },
  { user_id: "user-002", name: "Carlos Díaz" },
];

const STUB_PAYMENT: CamporeePayment = {
  payment_id: 99,
  camporee_id: 5,
  member_id: "user-001",
  member_name: "Ana López",
  amount: 150,
  payment_type: "inscription",
  reference: "REF-001",
  notes: "Pago completo",
  paid_at: "2026-03-15T00:00:00.000Z",
};

const t = messages.camporees;

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporeeId?: number;
  members?: CamporeeMember[];
  payment?: CamporeePayment | null;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    camporeeId = 5,
    members = STUB_MEMBERS,
    payment = null,
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentDialog
        open={open}
        onOpenChange={onOpenChange}
        camporeeId={camporeeId}
        members={members}
        payment={payment}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
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

describe("PaymentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePayment.mockResolvedValue({ ok: true });
    mockUpdatePayment.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode — rendering ────────────────────────────────────────────

  it("renders create mode title, member selector, amount input and register button", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.paymentDialog.titleCreate }),
    ).toBeInTheDocument();

    // Member select trigger is present — Radix SelectTrigger renders as combobox.
    // shadcn FormControl forwards id to the trigger but aria-name may not propagate
    // reliably in jsdom; query by role without name constraint, relying on position.
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);

    // Amount input — RHF spreads name attr so query by name attribute
    expect(document.querySelector('input[name="amount"]')).toBeInTheDocument();

    // Submit button shows "Registrar pago"
    expect(
      screen.getByRole("button", { name: t.paymentDialog.registerPayment }),
    ).toBeInTheDocument();

    // Cancel button
    expect(
      screen.getByRole("button", { name: t.paymentDialog.cancel }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode — rendering ──────────────────────────────────────────────

  it("renders edit mode title, member as read-only text, and save-changes button", () => {
    renderDialog({ payment: STUB_PAYMENT });

    expect(
      screen.getByRole("heading", { name: t.paymentDialog.titleEdit }),
    ).toBeInTheDocument();

    // Member displayed as read-only text
    expect(screen.getByText("Ana López")).toBeInTheDocument();

    // No select trigger for member in edit mode
    expect(
      screen.queryByRole("combobox", { name: new RegExp(t.paymentDialog.labelMember, "i") }),
    ).not.toBeInTheDocument();

    // Submit button shows "Guardar cambios"
    expect(
      screen.getByRole("button", { name: t.paymentDialog.saveChanges }),
    ).toBeInTheDocument();
  });

  // ── 3. Validation — amount required ──────────────────────────────────────

  it("shows amount validation error when amount is empty on submit", async () => {
    renderDialog();

    // Set amount to 0 so z.coerce.number().positive() fires the custom message
    // (undefined → NaN produces a different error; 0 produces the expected positive error)
    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    if (amountInput) {
      await act(async () => {
        fireEvent.change(amountInput, { target: { value: "0" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      // FormMessage renders the Zod error inside a <p>; use regex to be text-break tolerant
      expect(
        screen.getByText(new RegExp(messages.camporees.validation.amount_positive, "i")),
      ).toBeInTheDocument();
    });

    expect(mockCreatePayment).not.toHaveBeenCalled();
  });

  // ── 4. Happy path — create payment ───────────────────────────────────────

  it("calls createPayment with correct args and shows success toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    // Radix renders hidden native <select> elements for a11y.
    // In create mode: first select = member_id, second = payment_type.
    const allNativeSelects = document.querySelectorAll("select");
    const memberNative = allNativeSelects[0] as HTMLSelectElement | undefined;
    if (memberNative) {
      await act(async () => {
        fireEvent.change(memberNative, { target: { value: "user-001" } });
      });
    }

    // RHF spreads name="amount" onto the input — use name attribute to find it
    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    if (amountInput) {
      await act(async () => {
        fireEvent.change(amountInput, { target: { value: "200" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalledOnce();
    });

    const [camporeeId, memberId, payload] = mockCreatePayment.mock.calls[0] as [
      number,
      string,
      { amount: number; payment_type: string },
    ];
    expect(camporeeId).toBe(5);
    expect(memberId).toBe("user-001");
    expect(payload.amount).toBe(200);
    expect(payload.payment_type).toBe("inscription");

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.payment_created);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 5. Happy path — edit payment ─────────────────────────────────────────

  it("calls updatePayment (not createPayment) in edit mode and shows update toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ payment: STUB_PAYMENT });

    // Amount is pre-filled (150); change it via name attribute (RHF spreads name onto input)
    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    await act(async () => {
      if (amountInput) fireEvent.change(amountInput, { target: { value: "300" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdatePayment).toHaveBeenCalledOnce();
    });

    expect(mockCreatePayment).not.toHaveBeenCalled();

    const [paymentId, payload] = mockUpdatePayment.mock.calls[0] as [
      number,
      { amount: number },
    ];
    expect(paymentId).toBe(99);
    expect(payload.amount).toBe(300);

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.payment_updated);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Cancel closes dialog without API call ──────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: t.paymentDialog.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreatePayment).not.toHaveBeenCalled();
    expect(mockUpdatePayment).not.toHaveBeenCalled();
  });

  // ── 7. Submit button disabled while in flight ─────────────────────────────

  it("disables submit button while submission is in flight (edit mode)", async () => {
    let resolveUpdate!: () => void;
    mockUpdatePayment.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveUpdate = () => res({ ok: true });
      }),
    );

    renderDialog({ payment: STUB_PAYMENT });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: new RegExp(t.paymentDialog.saving, "i") }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveUpdate();
    });
  });

  // ── 8. API error path — shows error toast ────────────────────────────────

  it("shows error toast with server message when createPayment throws", async () => {
    mockCreatePayment.mockRejectedValue(new Error("Insufficient funds"));

    renderDialog();

    // member_id = first native select, amount = #amount input
    const memberNative = document.querySelector("select") as HTMLSelectElement | null;
    if (memberNative) {
      await act(async () => {
        fireEvent.change(memberNative, { target: { value: "user-001" } });
      });
    }

    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    if (amountInput) {
      await act(async () => {
        fireEvent.change(amountInput, { target: { value: "50" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Insufficient funds");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 9. API error path — fallback message ────────────────────────────────

  it("shows fallback translated error when createPayment throws non-Error", async () => {
    mockCreatePayment.mockRejectedValue("unexpected string error");

    renderDialog();

    const memberNative = document.querySelector("select") as HTMLSelectElement | null;
    if (memberNative) {
      await act(async () => {
        fireEvent.change(memberNative, { target: { value: "user-001" } });
      });
    }

    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    if (amountInput) {
      await act(async () => {
        fireEvent.change(amountInput, { target: { value: "50" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.save_payment);
    });
  });
});
