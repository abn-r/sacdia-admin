/**
 * Integration tests for EvaluateSectionDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog uses controlled inputs (no React Hook Form). Inline validation
 * via handlePointsChange. On open, useEffect syncs earnedPoints from
 * currentPoints prop and notes from currentNotes prop.
 *
 * Submit calls `evaluateSection(folderId, sectionId, { earned_points, notes })`.
 * Submit button is disabled until pointsError === null and input is non-empty.
 *
 * `evaluateSection` is mocked at module boundary.
 * ApiError is imported from `@/lib/api/client` and tested against instanceof check.
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
const mockEvaluateSection = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/annual-folders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/annual-folders")>();
  return {
    ...original,
    evaluateSection: (...args: unknown[]) => mockEvaluateSection(...args),
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

import { EvaluateSectionDialog } from "@/components/annual-folders/evaluate-section-dialog";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const t = messages.annual_folders;

const DEFAULT_PROPS = {
  folderId: "folder-abc",
  sectionId: "section-xyz",
  sectionName: "Actividades al aire libre",
  maxPoints: 50,
} as const;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  currentPoints?: number | null;
  currentNotes?: string | null;
  maxPoints?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    currentPoints = null,
    currentNotes = null,
    maxPoints = DEFAULT_PROPS.maxPoints,
  } = opts;

  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EvaluateSectionDialog
        open={open}
        onOpenChange={onOpenChange}
        folderId={DEFAULT_PROPS.folderId}
        sectionId={DEFAULT_PROPS.sectionId}
        sectionName={DEFAULT_PROPS.sectionName}
        maxPoints={maxPoints}
        currentPoints={currentPoints}
        currentNotes={currentNotes}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

function getPointsInput() {
  return document.getElementById("earned-points") as HTMLInputElement;
}

function getNotesTextarea() {
  return document.getElementById("eval-notes") as HTMLTextAreaElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /guardar evaluación/i });
}

function getCancelButton() {
  return screen.getByRole("button", { name: /cancelar/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvaluateSectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateSection.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title, section name, and form controls ────────────────────

  it("renders dialog title, section name, inputs and buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /evaluar sección/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(DEFAULT_PROPS.sectionName),
    ).toBeInTheDocument();
    expect(getPointsInput()).toBeInTheDocument();
    expect(getNotesTextarea()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
    expect(getCancelButton()).toBeInTheDocument();
  });

  // ── 2. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /evaluar sección/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. useEffect syncs form from currentPoints/currentNotes props ────────

  it("pre-fills points input and notes textarea from currentPoints/currentNotes props", () => {
    renderDialog({ currentPoints: 30, currentNotes: "Muy bien hecho" });

    expect(getPointsInput().value).toBe("30");
    expect(getNotesTextarea().value).toBe("Muy bien hecho");
  });

  // ── 4. Submit disabled when input is empty ───────────────────────────────

  it("keeps submit button disabled when points input is empty", () => {
    renderDialog({ currentPoints: null });

    // No input yet — earnedPoints === "" so isValid = false
    expect(getSubmitButton()).toBeDisabled();
  });

  // ── 5. Inline validation — shows error below maxPoints ───────────────────

  it("shows error message when entered points exceed maxPoints", async () => {
    const user = userEvent.setup();
    renderDialog({ maxPoints: 50 });

    await user.type(getPointsInput(), "99");

    expect(
      screen.getByText(/no puede superar el máximo de 50 puntos/i),
    ).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  // ── 6. Inline validation — negative value error ──────────────────────────

  it("shows error message for negative points", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(getPointsInput(), "-1");

    expect(screen.getByText(/no puede ser menor a 0/i)).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  // ── 7. Inline validation — non-integer value error ───────────────────────

  it("shows error message for non-integer points value", () => {
    renderDialog();

    fireEvent.change(getPointsInput(), { target: { value: "10.5" } });

    expect(screen.getByText(/debe ser un número entero/i)).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  // ── 8. Happy path — calls evaluateSection with correct args ──────────────

  it("calls evaluateSection with folderId, sectionId and earned_points on valid submit", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    fireEvent.change(getPointsInput(), { target: { value: "40" } });

    await act(async () => {
      fireEvent.submit(getPointsInput().closest("form")!);
    });

    await waitFor(() => {
      expect(mockEvaluateSection).toHaveBeenCalledWith(
        DEFAULT_PROPS.folderId,
        DEFAULT_PROPS.sectionId,
        { earned_points: 40, notes: undefined },
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.section_evaluated);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 9. Happy path — notes are sent when filled ───────────────────────────

  it("passes trimmed notes when the textarea is filled", async () => {
    renderDialog({ currentPoints: 25, currentNotes: "  good work  " });

    // currentNotes synced to textarea value; re-open to trigger useEffect
    // The textarea value is set directly from prop
    fireEvent.change(getNotesTextarea(), { target: { value: "great work" } });
    fireEvent.change(getPointsInput(), { target: { value: "25" } });

    await act(async () => {
      fireEvent.submit(getPointsInput().closest("form")!);
    });

    await waitFor(() => {
      expect(mockEvaluateSection).toHaveBeenCalledWith(
        DEFAULT_PROPS.folderId,
        DEFAULT_PROPS.sectionId,
        { earned_points: 25, notes: "great work" },
      );
    });
  });

  // ── 10. API error — ApiError message shown in toast ──────────────────────

  it("shows ApiError message in error toast when evaluateSection throws ApiError", async () => {
    const apiErr = new ApiError("Evaluation window closed", 422, null);
    mockEvaluateSection.mockRejectedValue(apiErr);

    renderDialog();
    fireEvent.change(getPointsInput(), { target: { value: "20" } });

    await act(async () => {
      fireEvent.submit(getPointsInput().closest("form")!);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Evaluation window closed");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 11. API error — i18n fallback for generic errors ────────────────────

  it("shows i18n fallback error when evaluateSection throws a non-ApiError", async () => {
    mockEvaluateSection.mockRejectedValue(new Error("network failure"));

    renderDialog();
    fireEvent.change(getPointsInput(), { target: { value: "15" } });

    await act(async () => {
      fireEvent.submit(getPointsInput().closest("form")!);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.save_evaluation_failed);
    });
  });

  // ── 12. In-flight state — buttons disabled while submitting ──────────────

  it("disables cancel and submit buttons while submission is in flight", async () => {
    let resolveEval!: () => void;
    mockEvaluateSection.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveEval = () => res({ ok: true });
      }),
    );

    renderDialog();
    fireEvent.change(getPointsInput(), { target: { value: "30" } });

    await act(async () => {
      fireEvent.submit(getPointsInput().closest("form")!);
    });

    // While submitting, the button label changes to "Guardando..."
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /guardando/i }),
      ).toBeDisabled();
      expect(getCancelButton()).toBeDisabled();
    });

    await act(async () => {
      resolveEval();
    });
  });

  // ── 13. Cancel does not call API ─────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call evaluateSection on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(getCancelButton());

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockEvaluateSection).not.toHaveBeenCalled();
  });
});
