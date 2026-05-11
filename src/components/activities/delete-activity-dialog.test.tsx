/**
 * Integration tests for DeleteActivityDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar.
 * On confirm: calls `deleteActivity(activity_id)`, shows success toast,
 * calls onSuccess() and closes the dialog.
 *
 * `deleteActivity` is mocked at module boundary (no fetch exercised).
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
import type { Activity } from "@/lib/api/activities";

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
const mockDeleteActivity = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/activities", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/activities")>();
  return {
    ...original,
    deleteActivity: (...args: unknown[]) => mockDeleteActivity(...args),
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

import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_ACTIVITY: Activity = {
  activity_id: 42,
  name: "Acampada Primavera 2026",
  club_id: 1,
  club_type_id: 2,
  club_section_id: 3,
  lat: 0,
  long: 0,
  activity_place: "Parque Central",
  activity_type_id: 1,
  active: true,
};

const t = messages.activities;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  activity?: Activity | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, activity = STUB_ACTIVITY, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteActivityDialog
        open={open}
        onOpenChange={onOpenChange}
        activity={activity}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteActivityDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteActivity.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /¿eliminar actividad\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  // ── 2. Shows activity name in description ────────────────────────────────

  it("shows the activity name in the description", () => {
    renderDialog({ activity: STUB_ACTIVITY });

    expect(screen.getByText(/Acampada Primavera 2026/)).toBeInTheDocument();
    expect(screen.getByText(/desactivará la actividad/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /¿eliminar actividad\?/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null activity — early return, no API call ─────────────────────────

  it("does not call deleteActivity when activity is null", async () => {
    renderDialog({ activity: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls deleteActivity with activity_id ────────────────

  it("calls deleteActivity with activity_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ activity: STUB_ACTIVITY });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteActivity).toHaveBeenCalledWith(42);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.deleted);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteActivity on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  // ── 7. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error message when deleteActivity throws", async () => {
    mockDeleteActivity.mockRejectedValue(new Error("Connection timeout"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Connection timeout");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when deleteActivity throws a non-Error", async () => {
    mockDeleteActivity.mockRejectedValue("plain string error");

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
    mockDeleteActivity.mockReturnValue(
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

  // ── 10. onSuccess is NOT called on error ─────────────────────────────────

  it("does NOT call onSuccess when deleteActivity fails", async () => {
    mockDeleteActivity.mockRejectedValue(new Error("Server error"));

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
