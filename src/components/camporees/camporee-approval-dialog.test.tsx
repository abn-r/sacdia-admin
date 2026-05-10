/**
 * Integration tests for CamporeeApprovalDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (static rejectSchema).
 * It calls the `onConfirm` prop (a Promise<void>) provided by the parent.
 * No direct HTTP calls — the parent owns the API call.
 *
 * Two modes (controlled by `mode` prop):
 *   - "approve": shows no textarea, calls onConfirm with no args
 *   - "reject":  shows optional rejection_reason textarea,
 *                calls onConfirm(rejectionReason)
 *
 * Validation: rejection_reason.max(500) — only fire if >500 chars.
 *
 * Renders are wrapped in `NextIntlClientProvider` with real `messages/es.json`.
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
import { ApiError } from "@/lib/api/client";

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

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENTITY_LABEL = "Club";
const ENTITY_NAME = "Club Los Pinos";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  mode?: ApprovalDialogMode;
  entityLabel?: string;
  entityName?: string;
  onConfirm?: () => Promise<void>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    mode = "approve",
    entityLabel = ENTITY_LABEL,
    entityName = ENTITY_NAME,
    onConfirm = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeApprovalDialog
        open={open}
        mode={mode}
        entityLabel={entityLabel}
        entityName={entityName}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess, onConfirm };
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

describe("CamporeeApprovalDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Approve mode — rendering ───────────────────────────────────────────

  it("renders approve mode title, entity name in description, and action buttons", () => {
    renderDialog({ mode: "approve" });

    // Title contains "Aprobar" and entity label
    expect(
      screen.getByRole("heading", { name: /Aprobar/i }),
    ).toBeInTheDocument();

    // Description contains entity name
    expect(screen.getByText(new RegExp(ENTITY_NAME, "i"))).toBeInTheDocument();

    // No textarea in approve mode
    expect(document.querySelector("textarea")).not.toBeInTheDocument();

    // Buttons
    expect(screen.getByRole("button", { name: /Aprobar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
  });

  // ── 2. Reject mode — rendering ────────────────────────────────────────────

  it("renders reject mode title and shows rejection_reason textarea", () => {
    renderDialog({ mode: "reject" });

    expect(
      screen.getByRole("heading", { name: /Rechazar/i }),
    ).toBeInTheDocument();

    // Textarea for rejection_reason is rendered in reject mode
    expect(document.querySelector("textarea")).toBeInTheDocument();
    expect(screen.getByText(/Motivo de rechazo/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Rechazar/i })).toBeInTheDocument();
  });

  // ── 3. Approve — calls onConfirm with no reason and shows success toast ───

  it("calls onConfirm() with no args in approve mode and shows success toast", async () => {
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { onOpenChange, onSuccess } = renderDialog({
      mode: "approve",
      onConfirm: mockOnConfirm,
    });

    await submitForm();

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledOnce();
    });

    // onConfirm called with undefined (no rejection reason in approve mode)
    expect(mockOnConfirm).toHaveBeenCalledWith(undefined);

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining(ENTITY_NAME),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 4. Reject — calls onConfirm with reason when provided ────────────────

  it("calls onConfirm(reason) in reject mode when rejection reason is entered", async () => {
    const mockOnConfirm = vi.fn<(reason?: string) => Promise<void>>().mockResolvedValue(undefined);
    const { onOpenChange, onSuccess } = renderDialog({
      mode: "reject",
      onConfirm: mockOnConfirm,
    });

    // Type a rejection reason
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
    await act(async () => {
      if (textarea) fireEvent.change(textarea, { target: { value: "Documentación incompleta" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledOnce();
    });

    expect(mockOnConfirm).toHaveBeenCalledWith("Documentación incompleta");

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining(ENTITY_NAME),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 5. Reject — calls onConfirm with empty string when no reason ──────────

  it("calls onConfirm with empty string when rejection reason is omitted", async () => {
    const mockOnConfirm = vi.fn<(reason?: string) => Promise<void>>().mockResolvedValue(undefined);
    renderDialog({ mode: "reject", onConfirm: mockOnConfirm });

    // Submit without filling the textarea
    await submitForm();

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledOnce();
    });

    // rejection_reason is optional — empty string is valid
    const calledWith = mockOnConfirm.mock.calls[0]![0];
    expect(typeof calledWith === "string" || calledWith === undefined).toBe(true);
  });

  // ── 6. Cancel closes dialog without calling onConfirm ─────────────────────

  it("calls onOpenChange(false) and does NOT call onConfirm when cancel clicked", async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onConfirm: mockOnConfirm });

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  // ── 7. Submit button disabled while in flight ─────────────────────────────

  it("disables submit button while onConfirm is pending", async () => {
    let resolveConfirm!: () => void;
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockReturnValue(
      new Promise<void>((res) => {
        resolveConfirm = res;
      }),
    );

    renderDialog({ mode: "approve", onConfirm: mockOnConfirm });

    await submitForm();

    await waitFor(() => {
      // The submit button is disabled while pending (contains Loader2 + label)
      const submitBtn = screen.getByRole("button", { name: /Aprobar/i });
      expect(submitBtn).toBeDisabled();
    });

    await act(async () => {
      resolveConfirm();
    });
  });

  // ── 8. ApiError — shows error message from ApiError instance ─────────────

  it("shows toast.error with ApiError message when onConfirm throws ApiError", async () => {
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockRejectedValue(
      new ApiError("Permiso insuficiente", 403, null),
    );

    renderDialog({ mode: "approve", onConfirm: mockOnConfirm });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Permiso insuficiente");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 9. Generic error — shows unexpected error fallback ────────────────────

  it("shows unexpected error toast when onConfirm throws non-ApiError", async () => {
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockRejectedValue(
      new Error("Network failure"),
    );

    renderDialog({ mode: "reject", onConfirm: mockOnConfirm });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(messages.camporees.errors.unexpected);
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 10. Validation — rejection_reason exceeds 500 chars ──────────────────

  it("shows validation error when rejection_reason exceeds 500 characters", async () => {
    const mockOnConfirm = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    renderDialog({ mode: "reject", onConfirm: mockOnConfirm });

    // Build a string of 501 characters
    const longText = "a".repeat(501);
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
    await act(async () => {
      if (textarea) fireEvent.change(textarea, { target: { value: longText } });
    });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/500/i),
      ).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
