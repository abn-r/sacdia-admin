/**
 * Integration tests for RequestReviewDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Unlike the membership/validation dialogs, this dialog does NOT call
 * an API module directly — it accepts an `onSubmit` callback as a
 * prop (parent supplies the API integration). We test the dialog by
 * passing a `vi.fn()` as `onSubmit` and asserting the dialog
 * orchestrates form/state correctly. No MSW handler or module mock is
 * required for the API surface itself.
 *
 * Same approve/reject schema split as ValidationReviewDialog:
 *   - approved → comment optional
 *   - rejected → comment required (translated message)
 *
 * Reject schema is built via `useMemo(buildRejectSchema(tVal), ...)`
 * using `tVal("comment_required")`. Tests must wrap renders in
 * `NextIntlClientProvider` with the real `messages/es.json`.
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
import type { ReviewAction, ReviewRequestPayload } from "@/lib/api/requests";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

import { RequestReviewDialog } from "@/components/requests/request-review-dialog";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  action?: ReviewAction;
  title?: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit?: (...args: any[]) => Promise<void>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    action = "approved",
    title = action === "approved"
      ? "Aprobar transferencia"
      : "Rechazar transferencia",
    description = action === "approved"
      ? "Se aprobará la solicitud de transferencia de Ana López."
      : "Se rechazará la solicitud de Ana López. El motivo es obligatorio.",
    onSubmit = vi.fn<(payload: ReviewRequestPayload) => Promise<void>>().mockResolvedValue(undefined),
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequestReviewDialog
        open={open}
        action={action}
        title={title}
        description={description}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess, onSubmit };
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

describe("RequestReviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── APPROVE mode ──────────────────────────────────────────────────────────

  describe("approve mode", () => {
    it("renders title, description, optional comment label and Approve button", () => {
      renderDialog({ action: "approved" });

      expect(
        screen.getByRole("heading", { name: /Aprobar transferencia/i }),
      ).toBeInTheDocument();

      expect(
        screen.getByText(/Se aprobará la solicitud de transferencia de Ana López/i),
      ).toBeInTheDocument();

      expect(screen.getByText(/Comentarios \(opcional\)/i)).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /^Cancelar$/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Aprobar$/ }),
      ).toBeInTheDocument();
    });

    it("submits successfully without a comment and forwards correct payload", async () => {
      const onSubmit = vi
        .fn<(payload: ReviewRequestPayload) => Promise<void>>()
        .mockResolvedValue(undefined);
      const { onOpenChange, onSuccess } = renderDialog({
        action: "approved",
        onSubmit,
      });

      await submitForm();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
      });

      const [payload] = onSubmit.mock.calls[0] as [ReviewRequestPayload];
      expect(payload.action).toBe("approved");
      expect(payload.comment).toBeUndefined();

      expect(mockToastSuccess).toHaveBeenCalledWith("Solicitud aprobada");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("forwards the comment to onSubmit when provided", async () => {
      const onSubmit = vi
        .fn<(payload: ReviewRequestPayload) => Promise<void>>()
        .mockResolvedValue(undefined);
      renderDialog({ action: "approved", onSubmit });

      const textarea = screen.getByPlaceholderText(
        /Añade un comentario opcional/i,
      );
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "Aprobado por director" } });
      });

      await submitForm();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
      });

      const [payload] = onSubmit.mock.calls[0] as [ReviewRequestPayload];
      expect(payload.comment).toBe("Aprobado por director");
    });
  });

  // ── REJECT mode ───────────────────────────────────────────────────────────

  describe("reject mode", () => {
    it("renders reject title, required-comment label, and Reject button", () => {
      renderDialog({ action: "rejected" });

      expect(
        screen.getByRole("heading", { name: /Rechazar transferencia/i }),
      ).toBeInTheDocument();

      expect(screen.getByText(/Motivo de rechazo \*/i)).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /^Rechazar$/ }),
      ).toBeInTheDocument();
    });

    it("shows comment_required validation error when submitted empty", async () => {
      const onSubmit = vi
        .fn<(payload: ReviewRequestPayload) => Promise<void>>()
        .mockResolvedValue(undefined);
      renderDialog({ action: "rejected", onSubmit });

      await submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(messages.requests.validation.comment_required),
        ).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits successfully with a non-empty comment", async () => {
      const onSubmit = vi
        .fn<(payload: ReviewRequestPayload) => Promise<void>>()
        .mockResolvedValue(undefined);
      const { onSuccess } = renderDialog({ action: "rejected", onSubmit });

      const textarea = screen.getByPlaceholderText(
        /Describe el motivo del rechazo/i,
      );
      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: "Sección destino llena" },
        });
      });

      await submitForm();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
      });

      const [payload] = onSubmit.mock.calls[0] as [ReviewRequestPayload];
      expect(payload.action).toBe("rejected");
      expect(payload.comment).toBe("Sección destino llena");

      expect(mockToastSuccess).toHaveBeenCalledWith("Solicitud rechazada");
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call onSubmit when cancel clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(payload: ReviewRequestPayload) => Promise<void>>()
      .mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ action: "approved", onSubmit });

    await user.click(screen.getByRole("button", { name: /^Cancelar$/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ── Pending state ─────────────────────────────────────────────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveSubmit!: () => void;
    const onSubmit = vi
      .fn<(payload: ReviewRequestPayload) => Promise<void>>()
      .mockReturnValue(
        new Promise<void>((res) => {
          resolveSubmit = res;
        }),
      );

    renderDialog({ action: "approved", onSubmit });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Aprobar$/ }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveSubmit();
    });
  });

  // ── API error paths ───────────────────────────────────────────────────────

  it("shows ApiError message via toast.error when onSubmit throws ApiError", async () => {
    const onSubmit = vi
      .fn<(payload: ReviewRequestPayload) => Promise<void>>()
      .mockRejectedValue(new ApiError("Already processed", 409, null));

    renderDialog({ action: "approved", onSubmit });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Already processed");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("shows fallback translated error and keeps dialog open on non-ApiError", async () => {
    const onSubmit = vi
      .fn<(payload: ReviewRequestPayload) => Promise<void>>()
      .mockRejectedValue(new Error("boom"));

    const { onOpenChange } = renderDialog({ action: "approved", onSubmit });
    onOpenChange.mockClear();

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        messages.requests.errors.unexpected,
      );
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
