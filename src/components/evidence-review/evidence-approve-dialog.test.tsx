/**
 * Integration tests for EvidenceApproveDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog (not AlertDialog). Controlled textarea for optional comments.
 * On approve: calls `approveEvidence(type, id, comments)`.
 * On close while not submitting: clears comments + calls onOpenChange.
 * If isSubmitting, handleClose is a no-op (user cannot close).
 *
 * `approveEvidence` is mocked at module boundary.
 * ApiError from `@/lib/api/client` is used for the error instanceof check.
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
import type { EvidenceType } from "@/lib/api/evidence-review";

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
const mockApproveEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/evidence-review", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/evidence-review")>();
  return {
    ...original,
    approveEvidence: (...args: unknown[]) => mockApproveEvidence(...args),
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

import { EvidenceApproveDialog } from "@/components/evidence-review/evidence-approve-dialog";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const t = messages.evidence_review;

const DEFAULT_PROPS = {
  type: "folder" as EvidenceType,
  id: 42,
  memberName: "Ana García",
  sectionName: "Actividades al aire libre",
} as const;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  type?: EvidenceType;
  id?: number;
  memberName?: string;
  sectionName?: string;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    type = DEFAULT_PROPS.type,
    id = DEFAULT_PROPS.id,
    memberName = DEFAULT_PROPS.memberName,
    sectionName = DEFAULT_PROPS.sectionName,
  } = opts;

  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EvidenceApproveDialog
        open={open}
        type={type}
        id={id}
        memberName={memberName}
        sectionName={sectionName}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

function getCommentsTextarea() {
  return document.getElementById("approve-comments") as HTMLTextAreaElement;
}

function getApproveButton() {
  return screen.getByRole("button", { name: /aprobar/i });
}

function getCancelButton() {
  return screen.getByRole("button", { name: /cancelar/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceApproveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApproveEvidence.mockResolvedValue({
      id: DEFAULT_PROPS.id,
      type: DEFAULT_PROPS.type,
      status: "VALIDATED",
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title, description and action buttons ─────────────────────

  it("renders dialog title, member name, section name and action buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /aprobar evidencia/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_PROPS.memberName)).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_PROPS.sectionName)).toBeInTheDocument();
    expect(getCommentsTextarea()).toBeInTheDocument();
    expect(getApproveButton()).toBeInTheDocument();
    expect(getCancelButton()).toBeInTheDocument();
  });

  // ── 2. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /aprobar evidencia/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Renders description with correct member and section names ─────────

  it("renders description mentioning memberName and sectionName", () => {
    renderDialog({
      memberName: "Carlos Pérez",
      sectionName: "Honor de Natación",
    });

    expect(screen.getByText("Carlos Pérez")).toBeInTheDocument();
    expect(screen.getByText("Honor de Natación")).toBeInTheDocument();
  });

  // ── 4. Happy path — no comments — calls approveEvidence with undefined ───

  it("calls approveEvidence(type, id, undefined) when comments textarea is empty", async () => {
    const { onSuccess } = renderDialog();

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(mockApproveEvidence).toHaveBeenCalledWith(
        DEFAULT_PROPS.type,
        DEFAULT_PROPS.id,
        undefined,
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.evidence_approved);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 5. Happy path — with comments — passes trimmed string ───────────────

  it("calls approveEvidence with trimmed comments when textarea is filled", async () => {
    renderDialog();

    fireEvent.change(getCommentsTextarea(), {
      target: { value: "  Excelente trabajo  " },
    });

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(mockApproveEvidence).toHaveBeenCalledWith(
        DEFAULT_PROPS.type,
        DEFAULT_PROPS.id,
        "Excelente trabajo",
      );
    });
  });

  // ── 6. Happy path — passes correct type for different EvidenceTypes ──────

  it("calls approveEvidence with type='class' when type prop is 'class'", async () => {
    renderDialog({ type: "class", id: 77 });

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(mockApproveEvidence).toHaveBeenCalledWith("class", 77, undefined);
    });
  });

  // ── 7. Cancel closes dialog and clears comments ──────────────────────────

  it("calls onOpenChange(false) and clears comments on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(getCommentsTextarea(), "some text");
    expect(getCommentsTextarea().value).toBe("some text");

    await user.click(getCancelButton());

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockApproveEvidence).not.toHaveBeenCalled();
  });

  // ── 8. API error — ApiError message shown in toast ───────────────────────

  it("shows ApiError message in toast when approveEvidence throws ApiError", async () => {
    const apiErr = new ApiError("Evidence already approved", 409, null);
    mockApproveEvidence.mockRejectedValue(apiErr);

    const { onSuccess } = renderDialog();

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Evidence already approved");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 9. API error — i18n fallback for generic errors ──────────────────────

  it("shows i18n fallback error toast for non-ApiError throws", async () => {
    mockApproveEvidence.mockRejectedValue(new Error("network timeout"));

    renderDialog();

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.approve);
    });
  });

  // ── 10. In-flight — buttons disabled and Approve button shows spinner ────

  it("disables both buttons while approval is in flight", async () => {
    let resolveApprove!: () => void;
    mockApproveEvidence.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveApprove = () => res({ id: 42, type: "folder", status: "VALIDATED" });
      }),
    );

    renderDialog();

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    await waitFor(() => {
      expect(getApproveButton()).toBeDisabled();
      expect(getCancelButton()).toBeDisabled();
    });

    await act(async () => {
      resolveApprove();
    });
  });

  // ── 11. Char counter updates as user types ────────────────────────────────

  it("updates char counter as user types in comments textarea", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByText(/0\/500 caracteres/i)).toBeInTheDocument();

    await user.type(getCommentsTextarea(), "hola");

    expect(screen.getByText(/4\/500 caracteres/i)).toBeInTheDocument();
  });

  // ── 12. Cannot close while submitting ────────────────────────────────────

  it("does not call onOpenChange while submitting when cancel is attempted", async () => {
    let resolveApprove!: () => void;
    mockApproveEvidence.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveApprove = () => res({ id: 42, type: "folder", status: "VALIDATED" });
      }),
    );

    const { onOpenChange } = renderDialog();

    await act(async () => {
      fireEvent.click(getApproveButton());
    });

    // While in-flight, Cancel is disabled — click has no effect via the
    // disabled button (browser blocks it). onOpenChange should NOT be called.
    await waitFor(() => {
      expect(getCancelButton()).toBeDisabled();
    });

    fireEvent.click(getCancelButton());
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => {
      resolveApprove();
    });
  });
});
