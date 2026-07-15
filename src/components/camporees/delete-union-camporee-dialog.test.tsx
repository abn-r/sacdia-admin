/**
 * Integration tests for DeleteUnionCamporeeDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar.
 * On confirm: resolves ID from union_camporee_id ?? id ?? 0, calls
 * `deleteUnionCamporee(id)`, shows success toast, closes the dialog
 * and calls optional onSuccess().
 *
 * `deleteUnionCamporee` is mocked at module boundary.
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
import type { UnionCamporee } from "@/lib/api/camporees";

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
const mockDeleteUnionCamporee = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    deleteUnionCamporee: (...args: unknown[]) => mockDeleteUnionCamporee(...args),
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

import { DeleteUnionCamporeeDialog } from "@/components/camporees/delete-union-camporee-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_UNION_CAMPOREE: UnionCamporee = {
  union_camporee_id: 7,
  name: "Gran Camporee de Unión 2026",
  start_date: "2026-07-01",
  end_date: "2026-07-05",
};

const STUB_UNION_CAMPOREE_LEGACY: UnionCamporee = {
  id: 15,
  name: "Camporee Unión Legado",
  start_date: "2026-09-10",
  end_date: "2026-09-12",
};

const t = messages.camporees;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporee?: UnionCamporee | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, camporee = STUB_UNION_CAMPOREE, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteUnionCamporeeDialog
        open={open}
        onOpenChange={onOpenChange}
        camporee={camporee}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteUnionCamporeeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteUnionCamporee.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /eliminar camporee de unión/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  // ── 2. Shows camporee name in description ────────────────────────────────

  it("shows the camporee name in the description", () => {
    renderDialog({ camporee: STUB_UNION_CAMPOREE });

    expect(screen.getByText(/Gran Camporee de Unión 2026/)).toBeInTheDocument();
    expect(screen.getByText(/desactivará el camporee/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /eliminar camporee de unión/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null camporee — early return, no API call ─────────────────────────

  it("does not call deleteUnionCamporee when camporee is null", async () => {
    renderDialog({ camporee: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteUnionCamporee).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — uses union_camporee_id ───────────────────────────────

  it("calls deleteUnionCamporee with union_camporee_id, shows toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ camporee: STUB_UNION_CAMPOREE });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteUnionCamporee).toHaveBeenCalledWith(7);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.union_camporee_deleted);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Legacy id field — uses camporee.id when union_camporee_id absent ──

  it("calls deleteUnionCamporee with id when union_camporee_id is absent", async () => {
    renderDialog({ camporee: STUB_UNION_CAMPOREE_LEGACY });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteUnionCamporee).toHaveBeenCalledWith(15);
    });
  });

  // ── 7. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteUnionCamporee on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteUnionCamporee).not.toHaveBeenCalled();
  });

  // ── 8. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error.message when deleteUnionCamporee throws", async () => {
    mockDeleteUnionCamporee.mockRejectedValue(new Error("Network failure"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Network failure");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 9. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when deleteUnionCamporee throws a non-Error", async () => {
    mockDeleteUnionCamporee.mockRejectedValue({ code: 500 });

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.delete_camporee);
    });
  });

  // ── 10. In-flight state — buttons disabled while deleting ─────────────────

  it("disables both buttons while deletion is in flight", async () => {
    let resolveDelete!: () => void;
    mockDeleteUnionCamporee.mockReturnValue(
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
});
