/**
 * Integration tests for UserProgressDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Display dialog (no outer API fetch — data passed as prop).
 * Each section toggle calls apiRequestFromClient via PATCH.
 * `apiRequestFromClient` is mocked at module boundary.
 *
 * Key behaviors:
 *   - Shows user info (name, email, progress %) in header
 *   - Loads spinner when progressData is null
 *   - Empty state when modules is []
 *   - Renders module + section list; sections show strike-through when completed
 *   - Toggle section calls PATCH with correct payload, shows success toast
 *   - Toggle failure shows error toast
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
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

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
const mockApiRequest = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequestFromClient: (...args: unknown[]) => mockApiRequest(...args),
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

import { UserProgressDialog } from "@/components/certifications/user-progress-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.certifications;

const STUB_PROGRESS = {
  user_id: "user-abc",
  certification_id: 7,
  enrolled_at: "2026-01-15T00:00:00.000Z",
  completed_at: null,
  progress_percent: 50,
  user_name: "Ana García",
  user_email: "ana@example.com",
  modules: [
    {
      module_id: 1,
      title: "Módulo Uno",
      sections: [
        {
          section_id: 101,
          title: "Sección A",
          completed: true,
          completed_at: "2026-02-01T00:00:00.000Z",
          notes: null,
        },
        {
          section_id: 102,
          title: "Sección B",
          completed: false,
          completed_at: null,
          notes: null,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

type ProgressData = typeof STUB_PROGRESS | null;

interface RenderOpts {
  open?: boolean;
  progressData?: ProgressData;
  onProgressUpdated?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    progressData = STUB_PROGRESS,
    onProgressUpdated,
  } = opts;
  const onOpenChange = vi.fn();
  const updatedCb = onProgressUpdated ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserProgressDialog
        open={open}
        onOpenChange={onOpenChange}
        progressData={progressData}
        onProgressUpdated={updatedCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onProgressUpdated: updatedCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UserProgressDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title ────────────────────────────────────────────────

  it("renders 'Progreso del usuario' heading when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /progreso del usuario/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /progreso del usuario/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows loading spinner when progressData is null ────────────────────

  it("shows loading spinner when progressData is null", () => {
    renderDialog({ progressData: null });

    // Spinner is rendered via Loader2.animate-spin
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  // ── 4. Shows user info in header ──────────────────────────────────────────

  it("shows user name, email and progress percent in the header", () => {
    renderDialog();

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  // ── 5. Empty state when modules array is empty ────────────────────────────

  it("shows empty modules message when modules is []", () => {
    renderDialog({
      progressData: { ...STUB_PROGRESS, modules: [] },
    });

    expect(
      screen.getByText(/no hay módulos de progreso/i),
    ).toBeInTheDocument();
  });

  // ── 6. Renders module title and section list ──────────────────────────────

  it("renders module title and section names", () => {
    renderDialog();

    expect(screen.getByText("Módulo Uno")).toBeInTheDocument();
    expect(screen.getByText("Sección A")).toBeInTheDocument();
    expect(screen.getByText("Sección B")).toBeInTheDocument();
  });

  // ── 7. Completed section shows progress badge ─────────────────────────────

  it("shows module progress badge (1/2)", () => {
    renderDialog();

    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  // ── 8. Toggle section calls PATCH and shows success toast ────────────────

  it("calls PATCH with correct payload and shows success toast when toggling a section", async () => {
    renderDialog();

    // Find the toggle button for section_id=102 (incomplete → complete)
    const toggleBtns = screen.getAllByRole("button", {
      name: /marcar como completada/i,
    });

    await act(async () => {
      fireEvent.click(toggleBtns[0]);
    });

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("/certifications/users/user-abc/certifications/7/progress"),
        expect.objectContaining({
          method: "PATCH",
          body: { section_id: 102, completed: true },
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("completada"),
    );
  });

  // ── 9. Toggle completed section (mark as pending) shows correct toast ────

  it("shows 'pendiente' toast when toggling a completed section", async () => {
    renderDialog();

    const markPendingBtn = screen.getByRole("button", {
      name: /marcar como pendiente/i,
    });

    await act(async () => {
      fireEvent.click(markPendingBtn);
    });

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("/progress"),
        expect.objectContaining({
          body: { section_id: 101, completed: false },
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("pendiente"),
    );
  });

  // ── 10. API error shows error toast ──────────────────────────────────────

  it("shows error toast when PATCH fails", async () => {
    mockApiRequest.mockRejectedValue(new Error("Server error"));

    renderDialog();

    const toggleBtns = screen.getAllByRole("button", {
      name: /marcar como completada/i,
    });

    await act(async () => {
      fireEvent.click(toggleBtns[0]);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.toasts.progress_update_failed);
    });
  });

  // ── 11. onProgressUpdated is called after successful toggle ──────────────

  it("calls onProgressUpdated after successful toggle", async () => {
    const { onProgressUpdated } = renderDialog();

    const toggleBtns = screen.getAllByRole("button", {
      name: /marcar como completada/i,
    });

    await act(async () => {
      fireEvent.click(toggleBtns[0]);
    });

    await waitFor(() => {
      expect(onProgressUpdated).toHaveBeenCalledOnce();
    });
  });
});
