/**
 * Integration tests for ScoringCategoryDeleteDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar.
 * Action: onDelete(category.scoring_category_id) — async function prop.
 * Guards: exits early if category is null.
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
import type { ScoringCategory } from "@/lib/api/scoring-categories";

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

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { ScoringCategoryDeleteDialog } from "@/components/scoring-categories/scoring-category-delete-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.scoring_categories;

const STUB_CATEGORY: ScoringCategory = {
  scoring_category_id: 11,
  name: "Puntualidad",
  max_points: 10,
  active: true,
  origin_level: "LOCAL_FIELD",
  origin_id: 1,
  origin_badge: "Campo Local",
  readonly: false,
  translations: [],
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  category?: ScoringCategory | null;
  onDelete?: ReturnType<typeof vi.fn>;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    category = STUB_CATEGORY,
    onDelete,
    onSuccess,
  } = opts;
  const onOpenChange = vi.fn();
  const deleteCb = onDelete ?? vi.fn<(id: number) => Promise<void>>().mockResolvedValue(undefined);
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ScoringCategoryDeleteDialog
        open={open}
        onOpenChange={onOpenChange}
        category={category}
        onDelete={deleteCb}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onDelete: deleteCb, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScoringCategoryDeleteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title, category name and buttons ───────────────────────────

  it("renders title, category name in description, cancel and confirm buttons", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /eliminar categoría/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Puntualidad/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /eliminar categoría/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Category name shown in description ─────────────────────────────────

  it("shows the category name in bold in the description", () => {
    renderDialog({ category: { ...STUB_CATEGORY, name: "Asistencia" } });

    expect(screen.getByText(/Asistencia/)).toBeInTheDocument();
  });

  // ── 4. Category null — early return, no API call ──────────────────────────

  it("does not call onDelete when category is null", async () => {
    const { onDelete } = renderDialog({ category: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(onDelete).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls onDelete with id, shows success toast ───────────

  it("calls onDelete with scoring_category_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onDelete, onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(11);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.deleted);
    expect(onSuccess).toHaveBeenCalledWith(11);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel does not call onDelete ─────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call onDelete on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onDelete } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDelete).not.toHaveBeenCalled();
  });

  // ── 7. Error path — Error.message shown in toast ──────────────────────────

  it("shows Error.message in toast when onDelete throws", async () => {
    const failingDelete = vi.fn<(id: number) => Promise<void>>().mockRejectedValue(
      new Error("Categoría en uso, no se puede eliminar"),
    );
    const { onSuccess } = renderDialog({ onDelete: failingDelete });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Categoría en uso, no se puede eliminar",
      );
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. Error path — i18n fallback for non-Error throws ───────────────────

  it("shows i18n fallback error toast when onDelete throws a non-Error", async () => {
    const failingDelete = vi.fn<(id: number) => Promise<void>>().mockRejectedValue({ code: 500 });
    renderDialog({ onDelete: failingDelete });

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
    let resolve!: () => void;
    const slowDelete = vi.fn<(id: number) => Promise<void>>().mockReturnValue(
      new Promise<void>((res) => {
        resolve = res;
      }),
    );

    renderDialog({ onDelete: slowDelete });

    const confirmBtn = screen.getByRole("button", { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /eliminando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolve();
    });
  });

  // ── 10. Description includes historical records note ─────────────────────

  it("shows note about historical records being preserved", () => {
    renderDialog();

    expect(
      screen.getByText(/registros históricos se conservarán/i),
    ).toBeInTheDocument();
  });
});
