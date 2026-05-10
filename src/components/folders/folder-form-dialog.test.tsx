/**
 * Integration tests for FolderFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog calls `createFolder` and `updateFolder` from `@/lib/api/folders`.
 * IMPORTANT: both functions always throw "Not implemented" — the backend
 * endpoints are pending. We mock the module so tests control the behavior.
 *
 * Because the Zod schema is built with `buildSchema(tVal)` inside the
 * component (using real translations), `NextIntlClientProvider` with the
 * real `messages/es.json` is mandatory — without it the schema builder
 * throws when calling `tVal("name_min", ...)`.
 *
 * Shadcn <Form> sets `aria-invalid="true"` on fields with errors after a
 * submit attempt — we assert on this to lock the primitive's behavior.
 *
 * RTL auto-cleanup:
 * Vitest uses `globals: false`. We explicitly import `cleanup` and call it
 * in `afterEach` to prevent DOM bleed-through between tests.
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

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

// Radix UI's Switch component (used inside FolderFormDialog) calls
// ResizeObserver internally. jsdom does not implement it. Polyfill with a
// no-op so the component mounts without throwing.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockCreateFolder = vi.fn();
const mockUpdateFolder = vi.fn();

vi.mock("@/lib/api/folders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/folders")>();
  return {
    ...original,
    createFolder: (data: unknown) => mockCreateFolder(data),
    updateFolder: (id: string, data: unknown) => mockUpdateFolder(id, data),
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

import { FolderFormDialog } from "@/components/folders/folder-form-dialog";
import type { FolderTemplate } from "@/lib/api/folders";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_FOLDER: FolderTemplate = {
  folder_id: "f-001",
  name: "Carpeta Conquistadores 2025",
  description: "Descripción de prueba",
  active: true,
  club_type_ids: [1],
  created_at: null,
  updated_at: null,
  modules: [],
};

const folderMessages = messages.folders;
const validationMessages = messages.folders.validation;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderFolderDialogOptions {
  folder?: FolderTemplate | null;
}

function renderDialog({ folder = null }: RenderFolderDialogOptions = {}) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FolderFormDialog
        open={true}
        onOpenChange={onOpenChange}
        folder={folder}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenChange, onSuccess, ...utils };
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

describe("FolderFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFolder.mockResolvedValue(STUB_FOLDER);
    mockUpdateFolder.mockResolvedValue(STUB_FOLDER);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog with all fields ─────────────────────────────────────

  it("renders dialog title, name field, description field and submit button", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Nueva carpeta de evidencias" })).toBeInTheDocument();

    // Name field
    expect(screen.getByPlaceholderText(/Carpeta Conquistadores/i)).toBeInTheDocument();

    // Description field
    expect(screen.getByPlaceholderText(/Descripción opcional/i)).toBeInTheDocument();

    // Active switch label
    expect(screen.getByText("Carpeta activa")).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear carpeta" })).toBeInTheDocument();
  });

  it("renders edit title and edit button when folder prop is provided", () => {
    renderDialog({ folder: STUB_FOLDER });

    expect(screen.getByRole("heading", { name: "Editar carpeta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("populates fields with folder data in edit mode", () => {
    renderDialog({ folder: STUB_FOLDER });

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    expect(nameInput).toHaveValue(STUB_FOLDER.name);
  });

  // ── 2. Name validation — required and min length ──────────────────────────

  it("shows aria-invalid on name field when submitted empty", async () => {
    renderDialog();

    await submitForm();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await waitFor(() => {
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("shows min-length validation error when name is too short", async () => {
    renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Ab" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });

    // Validation message should reference min=3
    expect(
      screen.getByText(validationMessages.name_min.replace("{min}", "3")),
    ).toBeInTheDocument();
  });

  it("does NOT mark name invalid when name meets min length (3+ chars)", async () => {
    renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "ABC" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledOnce();
    });

    expect(nameInput).not.toHaveAttribute("aria-invalid", "true");
  });

  // ── 3. Description is optional ─────────────────────────────────────────────

  it("submits successfully without description (description is optional)", async () => {
    const { onSuccess } = renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta de prueba" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledOnce();
    });

    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 4. Successful create ───────────────────────────────────────────────────

  it("calls createFolder with correct payload and closes dialog on success", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta Aventureros 2025" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledOnce();
    });

    const [calledPayload] = mockCreateFolder.mock.calls[0] as [
      { name: string; active: boolean },
    ];
    expect(calledPayload.name).toBe("Carpeta Aventureros 2025");
    expect(calledPayload.active).toBe(true);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith(folderMessages.toasts.created);
  });

  // ── 5. Successful edit ─────────────────────────────────────────────────────

  it("calls updateFolder with folder id and updated payload on save", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ folder: STUB_FOLDER });

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta Editada" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateFolder).toHaveBeenCalledOnce();
    });

    const [calledId, calledPayload] = mockUpdateFolder.mock.calls[0] as [
      string,
      { name: string },
    ];
    expect(calledId).toBe(STUB_FOLDER.folder_id);
    expect(calledPayload.name).toBe("Carpeta Editada");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith(folderMessages.toasts.updated);
  });

  // ── 6. Submit during pending ───────────────────────────────────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveCreate!: () => void;
    mockCreateFolder.mockReturnValue(
      new Promise<void>((res) => {
        resolveCreate = res;
      }),
    );

    renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta Válida" } });
    });

    await submitForm();

    expect(screen.getByRole("button", { name: "Creando..." })).toBeDisabled();

    await act(async () => {
      resolveCreate();
    });
  });

  // ── 7. API error response ──────────────────────────────────────────────────

  it("shows error toast when createFolder rejects", async () => {
    mockCreateFolder.mockRejectedValue(new Error("Backend unavailable"));

    renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta con error" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Backend unavailable");
    });
  });

  it("shows fallback error message when createFolder rejects with non-Error", async () => {
    mockCreateFolder.mockRejectedValue("string error");

    renderDialog();

    const nameInput = screen.getByPlaceholderText(/Carpeta Conquistadores/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Carpeta fallback" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Error al crear la carpeta");
    });
  });

  // ── 8. Cancel closes dialog ────────────────────────────────────────────────

  it("calls onOpenChange(false) when cancel is clicked without calling createFolder", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateFolder).not.toHaveBeenCalled();
  });
});
