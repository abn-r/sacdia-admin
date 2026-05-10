/**
 * Integration tests for ValidationReviewDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form with a Zod schema that switches
 * between APPROVE (comment optional) and REJECT (comment required)
 * based on the `action` prop. We exercise both branches.
 *
 * API: `reviewValidation(entityType, entityId, payload)` from
 * `@/lib/api/validation`. We mock the module so MSW is not needed
 * (consistent with InsuranceFormDialog/FolderFormDialog patterns).
 *
 * The reject schema is built inside a `useMemo` from the localized
 * translator `tVal("comment_required")`, so renders MUST wrap in
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
import type { ValidationAction, ValidationEntityType } from "@/lib/api/validation";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReview = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/validation", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/validation")>();
  return {
    ...original,
    reviewValidation: (
      entityType: ValidationEntityType,
      entityId: number | string,
      payload: unknown,
    ) => mockReview(entityType, entityId, payload),
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

import { ValidationReviewDialog } from "@/components/validation/validation-review-dialog";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  entityType?: ValidationEntityType;
  entityId?: number | string;
  memberName?: string;
  entityName?: string;
  action?: ValidationAction;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    entityType = "class",
    entityId = 100,
    memberName = "Ana López",
    entityName = "Amigo de la Naturaleza",
    action = "APPROVED",
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ValidationReviewDialog
        open={open}
        entityType={entityType}
        entityId={entityId}
        memberName={memberName}
        entityName={entityName}
        action={action}
        onOpenChange={onOpenChange}
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

describe("ValidationReviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReview.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── APPROVE mode ──────────────────────────────────────────────────────────

  describe("approve mode", () => {
    it("renders approve title, optional comment label, comment textarea, and Approve button", () => {
      renderDialog({ action: "APPROVED" });

      expect(
        screen.getByRole("heading", { name: /Aprobar validación/i }),
      ).toBeInTheDocument();

      expect(screen.getByText(/Comentarios \(opcional\)/i)).toBeInTheDocument();

      // Description with interpolated entity + member
      expect(
        screen.getByText(/Amigo de la Naturaleza/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Ana López/)).toBeInTheDocument();

      // Buttons
      expect(
        screen.getByRole("button", { name: /^Cancelar$/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Aprobar$/ }),
      ).toBeInTheDocument();
    });

    it("submits successfully without a comment (comment is optional in approve)", async () => {
      const { onOpenChange, onSuccess } = renderDialog({ action: "APPROVED" });

      await submitForm();

      await waitFor(() => {
        expect(mockReview).toHaveBeenCalledOnce();
      });

      const [entityType, entityId, payload] = mockReview.mock.calls[0] as [
        ValidationEntityType,
        number,
        { action: ValidationAction; comment?: string },
      ];
      expect(entityType).toBe("class");
      expect(entityId).toBe(100);
      expect(payload.action).toBe("APPROVED");
      expect(payload.comment).toBeUndefined();

      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Amigo de la Naturaleza aprobado correctamente para Ana López",
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("forwards the comment to the API when provided", async () => {
      renderDialog({ action: "APPROVED" });

      const textarea = screen.getByPlaceholderText(
        /Añade un comentario opcional/i,
      );
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "Buen trabajo" } });
      });

      await submitForm();

      await waitFor(() => {
        expect(mockReview).toHaveBeenCalledOnce();
      });

      const [, , payload] = mockReview.mock.calls[0] as [
        unknown,
        unknown,
        { comment?: string },
      ];
      expect(payload.comment).toBe("Buen trabajo");
    });
  });

  // ── REJECT mode ───────────────────────────────────────────────────────────

  describe("reject mode", () => {
    it("renders reject title, required-comment label, and Reject button", () => {
      renderDialog({ action: "REJECTED" });

      expect(
        screen.getByRole("heading", { name: /Rechazar validación/i }),
      ).toBeInTheDocument();

      expect(screen.getByText(/Motivo de rechazo \*/i)).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /^Rechazar$/ }),
      ).toBeInTheDocument();
    });

    it("shows comment_required validation error when submitted empty", async () => {
      renderDialog({ action: "REJECTED" });

      await submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(messages.validation_admin.validation.comment_required),
        ).toBeInTheDocument();
      });

      expect(mockReview).not.toHaveBeenCalled();
    });

    it("submits successfully with a non-empty comment", async () => {
      const { onSuccess } = renderDialog({ action: "REJECTED" });

      const textarea = screen.getByPlaceholderText(
        /Describe el motivo del rechazo/i,
      );
      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: "Falta evidencia fotográfica" },
        });
      });

      await submitForm();

      await waitFor(() => {
        expect(mockReview).toHaveBeenCalledOnce();
      });

      const [, , payload] = mockReview.mock.calls[0] as [
        unknown,
        unknown,
        { action: ValidationAction; comment?: string },
      ];
      expect(payload.action).toBe("REJECTED");
      expect(payload.comment).toBe("Falta evidencia fotográfica");

      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Amigo de la Naturaleza rechazado",
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ action: "APPROVED" });

    await user.click(screen.getByRole("button", { name: /^Cancelar$/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockReview).not.toHaveBeenCalled();
  });

  // ── Pending state ─────────────────────────────────────────────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveReview!: () => void;
    mockReview.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveReview = () => res({ ok: true });
      }),
    );

    renderDialog({ action: "APPROVED" });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Aprobar$/ }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveReview();
    });
  });

  // ── API error paths ───────────────────────────────────────────────────────

  it("shows ApiError message via toast.error when API throws ApiError", async () => {
    mockReview.mockRejectedValue(
      new ApiError("Validation already reviewed", 409, null),
    );

    renderDialog({ action: "APPROVED" });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Validation already reviewed");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("shows fallback translated error and keeps dialog open on non-ApiError", async () => {
    mockReview.mockRejectedValue(new Error("network down"));

    const { onOpenChange } = renderDialog({ action: "APPROVED" });
    onOpenChange.mockClear();

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        messages.validation_admin.errors.unexpected,
      );
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
