/**
 * Integration tests for EvidenceUploadDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog with file upload (drop zone + file input) and optional textarea.
 * Action: uploadEvidence(folderId, sectionId, file, description?).
 * Guards: exits early (toast error) if no file selected.
 * Resets state (file + description) when dialog closes.
 *
 * `uploadEvidence` is mocked at module boundary.
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
const mockUploadEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/annual-folders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/annual-folders")>();
  return {
    ...original,
    uploadEvidence: (...args: unknown[]) => mockUploadEvidence(...args),
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

import { EvidenceUploadDialog } from "@/components/annual-folders/evidence-upload-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.annual_folders;

const STUB_FILE = new File(["content"], "foto.jpg", { type: "image/jpeg" });
const FOLDER_ID = "folder-abc";
const SECTION_ID = "section-123";
const SECTION_NAME = "Actividades recreativas";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  folderId?: string;
  sectionId?: string;
  sectionName?: string;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    folderId = FOLDER_ID,
    sectionId = SECTION_ID,
    sectionName = SECTION_NAME,
    onSuccess,
  } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EvidenceUploadDialog
        open={open}
        onOpenChange={onOpenChange}
        folderId={folderId}
        sectionId={sectionId}
        sectionName={sectionName}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceUploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadEvidence.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and section name ──────────────────────────────

  it("renders dialog title and section name in description", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /subir evidencia/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(SECTION_NAME))).toBeInTheDocument();
  });

  // ── 2. Dialog not rendered when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /subir evidencia/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows drop zone and both buttons ──────────────────────────────────

  it("renders drop zone, cancel and submit buttons", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /subir evidencia/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/arrastra un archivo/i),
    ).toBeInTheDocument();
  });

  // ── 4. Submit button disabled when no file selected ──────────────────────

  it("disables the submit button when no file is selected", () => {
    renderDialog();

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    expect(submitBtn).toBeDisabled();
  });

  // ── 5. Shows file name after selecting a file ────────────────────────────

  it("shows selected file name and enables submit button after file selection", async () => {
    renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    expect(screen.getByText("foto.jpg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir evidencia/i })).not.toBeDisabled();
  });

  // ── 6. Toast error when submitting without a file ─────────────────────────

  it("shows file_required toast when form is submitted without a file", async () => {
    renderDialog();

    // Force submit via form event even though button is disabled
    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockToastError).toHaveBeenCalledWith(t.toasts.file_required);
    expect(mockUploadEvidence).not.toHaveBeenCalled();
  });

  // ── 7. Happy path — uploads file and calls onSuccess ─────────────────────

  it("calls uploadEvidence with correct args, shows success toast and calls onSuccess", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    // Add a description
    const textarea = screen.getByPlaceholderText(/descripción breve/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Mi descripción" } });
    });

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockUploadEvidence).toHaveBeenCalledWith(
        FOLDER_ID,
        SECTION_ID,
        STUB_FILE,
        "Mi descripción",
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.evidence_uploaded);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 8. Uploads without description (trims empty string → undefined) ───────

  it("passes undefined for description when textarea is blank", async () => {
    renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockUploadEvidence).toHaveBeenCalledWith(
        FOLDER_ID,
        SECTION_ID,
        STUB_FILE,
        undefined,
      );
    });
  });

  // ── 9. Error path — shows error message from Error instance ──────────────

  it("shows error toast with Error.message when uploadEvidence throws", async () => {
    mockUploadEvidence.mockRejectedValue(new Error("Archivo demasiado grande"));

    renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Archivo demasiado grande");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 10. Error path — fallback i18n message for non-Error throws ──────────

  it("shows i18n fallback error toast when uploadEvidence throws a non-Error", async () => {
    mockUploadEvidence.mockRejectedValue({ status: 500 });

    renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.upload_evidence_failed);
    });
  });

  // ── 11. Cancel closes dialog without API call ─────────────────────────────

  it("calls onOpenChange(false) and does NOT call uploadEvidence on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockUploadEvidence).not.toHaveBeenCalled();
  });

  // ── 12. In-flight state — buttons disabled while uploading ────────────────

  it("disables buttons while upload is in flight", async () => {
    let resolve!: () => void;
    mockUploadEvidence.mockReturnValue(
      new Promise<unknown>((res) => {
        resolve = () => res({ ok: true });
      }),
    );

    renderDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [STUB_FILE] } });
    });

    const submitBtn = screen.getByRole("button", { name: /subir evidencia/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /subiendo/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolve();
    });
  });
});
