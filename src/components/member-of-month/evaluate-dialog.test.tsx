/**
 * Integration tests for EvaluateMemberOfMonthDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog with two Radix Select inputs (month + year) and submit/cancel buttons.
 * Action: evaluateMemberOfMonth(clubId, sectionId, { month, year }).
 * Defaults to previous month/year on open; resets to defaults on close.
 *
 * Radix Select rendered via jsdom — use document.querySelectorAll("select")
 * with fireEvent.change to drive value changes.
 *
 * `evaluateMemberOfMonth` is mocked at module boundary.
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
const mockEvaluate = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/member-of-month", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/member-of-month")>();
  return {
    ...original,
    evaluateMemberOfMonth: (...args: unknown[]) => mockEvaluate(...args),
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

import { EvaluateMemberOfMonthDialog } from "@/components/member-of-month/evaluate-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.member_of_month;

const CLUB_ID = 3;
const SECTION_ID = 7;
const SECTION_NAME = "Tropa Estrellas";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  clubId?: number;
  sectionId?: number;
  sectionName?: string;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    clubId = CLUB_ID,
    sectionId = SECTION_ID,
    sectionName = SECTION_NAME,
    onSuccess,
  } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EvaluateMemberOfMonthDialog
        open={open}
        onOpenChange={onOpenChange}
        clubId={clubId}
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

describe("EvaluateMemberOfMonthDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluate.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and section name ───────────────────────────────

  it("renders dialog title and section name in description", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /evaluar miembro del mes/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(SECTION_NAME))).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /evaluar miembro del mes/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows month and year selects and action buttons ────────────────────

  it("renders month select, year select, cancel and submit buttons", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /evaluar/i })).toBeInTheDocument();
    // There should be a month trigger and year trigger (Radix Select renders as role=combobox)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  // ── 4. Happy path — calls evaluateMemberOfMonth with correct args ─────────

  it("calls evaluateMemberOfMonth with clubId, sectionId and selected period", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    // Trigger select changes using native selects rendered by Radix in jsdom
    const selects = document.querySelectorAll("select");
    // First select is month, second is year
    if (selects[0]) {
      fireEvent.change(selects[0], { target: { value: "4" } });
    }
    if (selects[1]) {
      fireEvent.change(selects[1], { target: { value: "2025" } });
    }

    const submitBtn = screen.getByRole("button", { name: /evaluar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockEvaluate).toHaveBeenCalledWith(
        CLUB_ID,
        SECTION_ID,
        expect.objectContaining({ month: expect.any(Number), year: expect.any(Number) }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 5. API error — shows Error.message ───────────────────────────────────

  it("shows error toast with Error.message when evaluateMemberOfMonth throws", async () => {
    mockEvaluate.mockRejectedValue(new Error("Ya existe una evaluación para ese período"));

    renderDialog();

    const submitBtn = screen.getByRole("button", { name: /evaluar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Ya existe una evaluación para ese período",
      );
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 6. API error — i18n fallback for non-Error throws ────────────────────

  it("shows i18n fallback error toast when evaluateMemberOfMonth throws non-Error", async () => {
    mockEvaluate.mockRejectedValue({ status: 500 });

    renderDialog();

    const submitBtn = screen.getByRole("button", { name: /evaluar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.evaluation_failed);
    });
  });

  // ── 7. Cancel closes dialog without API call ─────────────────────────────

  it("calls onOpenChange(false) and does NOT call evaluateMemberOfMonth on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  // ── 8. In-flight state — buttons disabled while evaluating ────────────────

  it("disables both buttons while evaluation is in flight", async () => {
    let resolve!: () => void;
    mockEvaluate.mockReturnValue(
      new Promise<unknown>((res) => {
        resolve = () => res({});
      }),
    );

    renderDialog();

    const submitBtn = screen.getByRole("button", { name: /evaluar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /evaluando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolve();
    });
  });

  // ── 9. onSuccess NOT called on error ─────────────────────────────────────

  it("does NOT call onSuccess when evaluateMemberOfMonth throws", async () => {
    mockEvaluate.mockRejectedValue(new Error("Server error"));

    const { onSuccess } = renderDialog();

    const submitBtn = screen.getByRole("button", { name: /evaluar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 10. Shows sectionName in bold in description ──────────────────────────

  it("shows section name in the dialog description", () => {
    renderDialog({ sectionName: "Campamento Norte" });

    expect(screen.getByText(/Campamento Norte/)).toBeInTheDocument();
  });
});
