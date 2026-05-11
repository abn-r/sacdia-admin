/**
 * Integration tests for DeleteCamporeeDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar.
 * On confirm: calls `deleteCamporee(id)`, shows success toast, closes
 * the dialog, and either redirects via router.push(redirectTo) or calls
 * onSuccess() + router.refresh().
 *
 * `deleteCamporee` is mocked at module boundary (no fetch exercised).
 * `useRouter` from next/navigation is mocked.
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
import type { Camporee } from "@/lib/api/camporees";

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

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDeleteCamporee = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    deleteCamporee: (...args: unknown[]) => mockDeleteCamporee(...args),
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

import { DeleteCamporeeDialog } from "@/components/camporees/delete-camporee-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CAMPOREE: Camporee = {
  camporee_id: 5,
  name: "Camporee Regional 2026",
  start_date: "2026-08-01",
  end_date: "2026-08-05",
};

const STUB_CAMPOREE_LEGACY_ID: Camporee = {
  id: 99,
  name: "Camporee Legado",
  start_date: "2026-09-01",
  end_date: "2026-09-03",
};

const t = messages.camporees;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporee?: Camporee | null;
  redirectTo?: string;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, camporee = STUB_CAMPOREE, redirectTo, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteCamporeeDialog
        open={open}
        onOpenChange={onOpenChange}
        camporee={camporee}
        redirectTo={redirectTo}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteCamporeeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCamporee.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and action buttons ──────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /eliminar camporee/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  // ── 2. Shows camporee name in description ────────────────────────────────

  it("shows the camporee name in the description", () => {
    renderDialog({ camporee: STUB_CAMPOREE });

    expect(screen.getByText(/Camporee Regional 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Esta acción desactivará el camporee/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /eliminar camporee/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null camporee — early return, no API call ─────────────────────────

  it("does not call deleteCamporee when camporee is null", async () => {
    renderDialog({ camporee: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteCamporee).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls deleteCamporee with camporee_id ───────────────

  it("calls deleteCamporee with camporee_id and closes dialog + calls onSuccess + refresh", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ camporee: STUB_CAMPOREE });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteCamporee).toHaveBeenCalledWith(5);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.camporee_deleted);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── 6. Legacy id field — uses camporee.id when camporee_id is absent ────

  it("calls deleteCamporee with id when camporee_id is absent", async () => {
    renderDialog({ camporee: STUB_CAMPOREE_LEGACY_ID });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteCamporee).toHaveBeenCalledWith(99);
    });
  });

  // ── 7. redirectTo — calls router.push instead of onSuccess + refresh ────

  it("calls router.push(redirectTo) and does NOT call onSuccess when redirectTo is set", async () => {
    const { onOpenChange, onSuccess } = renderDialog({
      camporee: STUB_CAMPOREE,
      redirectTo: "/dashboard/camporees",
    });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/camporees");
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  // ── 8. Cancel button closes without API call ─────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteCamporee on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteCamporee).not.toHaveBeenCalled();
  });

  // ── 9. API error — shows error toast from message ───────────────────────

  it("shows error toast from API error message when deleteCamporee throws Error", async () => {
    mockDeleteCamporee.mockRejectedValue(new Error("Server failure"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Server failure");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 10. API error — falls back to i18n message for non-Error throws ──────

  it("shows i18n fallback error toast when deleteCamporee throws a non-Error", async () => {
    mockDeleteCamporee.mockRejectedValue("plain string error");

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.delete_camporee);
    });
  });

  // ── 11. In-flight state — buttons disabled while deleting ────────────────

  it("disables both buttons while deletion is in flight", async () => {
    let resolveDelete!: () => void;
    mockDeleteCamporee.mockReturnValue(
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
