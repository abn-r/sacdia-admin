/**
 * Integration tests for DeleteUnitDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Desactivar.
 * On confirm: calls `deleteUnit(clubId, unit.unit_id)`, shows success toast,
 * calls onSuccess() and closes the dialog.
 *
 * Component uses AlertDialogMedia (custom shadcn extension) with AlertTriangle icon.
 *
 * `deleteUnit` is mocked at module boundary.
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
import type { Unit } from "@/lib/api/units";

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
const mockDeleteUnit = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/units", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/units")>();
  return {
    ...original,
    deleteUnit: (...args: unknown[]) => mockDeleteUnit(...args),
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

import { DeleteUnitDialog } from "@/components/units/delete-unit-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_UNIT: Unit = {
  unit_id: 21,
  name: "Unidad Águilas",
  active: true,
  club_type_id: 2,
};

const STUB_CLUB_ID = 5;

const t = messages.units_admin;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  unit?: Unit | null;
  clubId?: number;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, unit = STUB_UNIT, clubId = STUB_CLUB_ID, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteUnitDialog
        open={open}
        onOpenChange={onOpenChange}
        clubId={clubId}
        unit={unit}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteUnitDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteUnit.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /desactivar unidad/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });

  // ── 2. Shows unit name in description ───────────────────────────────────

  it("shows the unit name in the description", () => {
    renderDialog({ unit: STUB_UNIT });

    expect(screen.getByText(/Unidad Águilas/)).toBeInTheDocument();
    expect(screen.getByText(/La unidad y sus miembros/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /desactivar unidad/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null unit — early return, no API call ─────────────────────────────

  it("does not call deleteUnit when unit is null", async () => {
    renderDialog({ unit: null });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteUnit).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls deleteUnit with clubId and unit_id ────────────

  it("calls deleteUnit with clubId and unit_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ unit: STUB_UNIT, clubId: STUB_CLUB_ID });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteUnit).toHaveBeenCalledWith(STUB_CLUB_ID, 21);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.unit_deactivated);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteUnit on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteUnit).not.toHaveBeenCalled();
  });

  // ── 7. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error.message when deleteUnit throws", async () => {
    mockDeleteUnit.mockRejectedValue(new Error("Unit has active members"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Unit has active members");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when deleteUnit throws a non-Error", async () => {
    mockDeleteUnit.mockRejectedValue("plain string error");

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.deactivate_unit_failed);
    });
  });

  // ── 9. In-flight state — buttons disabled while deactivating ─────────────

  it("disables both buttons while deactivation is in flight", async () => {
    let resolveDeactivate!: () => void;
    mockDeleteUnit.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveDeactivate = () => res({ ok: true });
      }),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /desactivando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolveDeactivate();
    });
  });

  // ── 10. Different clubId is passed to API ────────────────────────────────

  it("passes the provided clubId correctly to deleteUnit", async () => {
    const { onOpenChange } = renderDialog({ clubId: 99 });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteUnit).toHaveBeenCalledWith(99, 21);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
