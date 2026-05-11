/**
 * Integration tests for FolderDeleteDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Eliminar carpeta.
 * On confirm: calls `deleteFolder(folder_id)`, shows success toast,
 * closes the dialog and calls onSuccess().
 *
 * Error handling: uses `ApiError instanceof` check for the error message.
 * Non-ApiError falls back to hardcoded string (not i18n).
 *
 * `deleteFolder` is mocked at module boundary. ApiError is imported from
 * the real client module (not mocked).
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
import type { FolderTemplate } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";

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
const mockDeleteFolder = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/folders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/folders")>();
  return {
    ...original,
    deleteFolder: (...args: unknown[]) => mockDeleteFolder(...args),
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

import { FolderDeleteDialog } from "@/components/folders/folder-delete-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_FOLDER: FolderTemplate = {
  folder_id: "11",
  name: "Carpeta de Conquistas 2026",
  description: "Evidencias del año",
  active: true,
  club_type_ids: [],
  created_at: null,
  updated_at: null,
  modules: [],
};

const t = messages.folders;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  folder?: FolderTemplate | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, folder = STUB_FOLDER, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FolderDeleteDialog
        open={open}
        onOpenChange={onOpenChange}
        folder={folder}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FolderDeleteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteFolder.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /eliminar carpeta de evidencias/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar carpeta/i })).toBeInTheDocument();
  });

  // ── 2. Shows folder name in description ─────────────────────────────────

  it("shows the folder name in the description", () => {
    renderDialog({ folder: STUB_FOLDER });

    expect(screen.getByText(/Carpeta de Conquistas 2026/)).toBeInTheDocument();
    expect(screen.getByText(/eliminará permanentemente/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /eliminar carpeta de evidencias/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Null folder — early return, no API call ───────────────────────────

  it("does not call deleteFolder when folder is null", async () => {
    renderDialog({ folder: null });

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteFolder).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls deleteFolder with folder_id ────────────────────

  it("calls deleteFolder with folder_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ folder: STUB_FOLDER });

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteFolder).toHaveBeenCalledWith("11");
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.deleted);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteFolder on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteFolder).not.toHaveBeenCalled();
  });

  // ── 7. ApiError instanceof — uses err.message directly ───────────────────

  it("shows ApiError.message in error toast when deleteFolder throws ApiError", async () => {
    mockDeleteFolder.mockRejectedValue(
      new ApiError("La carpeta tiene módulos activos", 409, null),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("La carpeta tiene módulos activos");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 8. Non-ApiError falls back to hardcoded message ─────────────────────

  it("shows hardcoded fallback message when deleteFolder throws a non-ApiError", async () => {
    mockDeleteFolder.mockRejectedValue(new Error("Generic network error"));

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("No se pudo eliminar la carpeta");
    });
  });

  // ── 9. In-flight state — buttons disabled while deleting ─────────────────

  it("disables both buttons while deletion is in flight", async () => {
    let resolveDelete!: () => void;
    mockDeleteFolder.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveDelete = () => res({ ok: true });
      }),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
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

  it("does NOT call onSuccess when deleteFolder fails", async () => {
    mockDeleteFolder.mockRejectedValue(new ApiError("Forbidden", 403, null));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /eliminar carpeta/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
