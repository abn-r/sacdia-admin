/**
 * Integration tests for ScoringCategoryDialog (create + edit modes).
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog with controlled form (name, maxPoints) + TranslationsTabsField.
 * TranslationsTabsField is mocked at module boundary (just renders esContent).
 * Action: onSave(payload, id?) — async function prop.
 *
 * Create mode: category prop is absent/null → title "Nueva categoría"
 * Edit mode: category prop provided → title "Editar categoría", form pre-filled.
 *
 * Validation:
 *   - name required (toast error)
 *   - name > 100 chars (toast error)
 *   - maxPoints < 1 (toast error)
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

// Mock TranslationsTabsField — just render esContent so we can test the
// name input without dealing with Radix Tabs internals.
vi.mock("@/components/forms/translations-tabs-field", () => ({
  TranslationsTabsField: ({
    esContent,
  }: {
    esContent: React.ReactNode;
    translations: unknown[];
    onTranslationsChange: (t: unknown[]) => void;
    onDirtyChange?: (d: boolean) => void;
    includeDescription?: boolean;
    disabled?: boolean;
  }) => <div data-testid="translations-tabs">{esContent}</div>,
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { ScoringCategoryDialog } from "@/components/scoring-categories/scoring-category-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.scoring_categories;

const STUB_CATEGORY: ScoringCategory = {
  scoring_category_id: 5,
  name: "Puntualidad",
  max_points: 10,
  active: true,
  origin_level: "LOCAL_FIELD",
  origin_id: 1,
  origin_badge: "Campo Local",
  readonly: false,
  translations: [],
};

const SAVED_CATEGORY: ScoringCategory = {
  ...STUB_CATEGORY,
  scoring_category_id: 5,
  name: "Puntualidad Updated",
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  category?: ScoringCategory | null;
  onSave?: ReturnType<typeof vi.fn>;
  onSuccess?: ReturnType<typeof vi.fn>;
  maxPointsCap?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, category, onSave, onSuccess, maxPointsCap } = opts;
  const onOpenChange = vi.fn();
  const saveCb =
    onSave ??
    vi
      .fn<(payload: unknown, id?: number) => Promise<ScoringCategory>>()
      .mockResolvedValue(SAVED_CATEGORY);
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ScoringCategoryDialog
        open={open}
        onOpenChange={onOpenChange}
        category={category}
        onSuccess={successCb}
        onSave={saveCb}
        maxPointsCap={maxPointsCap}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSave: saveCb, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScoringCategoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode title ──────────────────────────────────────────────────

  it("renders 'Nueva categoría' title when no category is provided", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /nueva categoría de puntuación/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode title ────────────────────────────────────────────────────

  it("renders 'Editar categoría' title when category is provided", () => {
    renderDialog({ category: STUB_CATEGORY });

    expect(
      screen.getByRole("heading", { name: /editar categoría/i }),
    ).toBeInTheDocument();
  });

  // ── 3. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /categoría/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. Edit mode pre-fills form with category data ───────────────────────

  it("pre-fills name and max_points inputs in edit mode", () => {
    renderDialog({ category: STUB_CATEGORY });

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    const pointsInput = document.querySelector(
      'input[id="sc_max_points"]',
    ) as HTMLInputElement;

    expect(nameInput?.value).toBe("Puntualidad");
    expect(pointsInput?.value).toBe("10");
  });

  // ── 5. Validation — name required ─────────────────────────────────────────

  it("shows name_required toast when name is empty and form is submitted", async () => {
    renderDialog();

    // Clear the name input and submit
    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockToastError).toHaveBeenCalledWith(t.validation.name_required);
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 6. Validation — name too long ─────────────────────────────────────────

  it("shows name_max toast when name exceeds 100 characters", async () => {
    renderDialog();

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockToastError).toHaveBeenCalledWith(t.validation.name_max);
  });

  // ── 7. Validation — maxPoints < 1 ────────────────────────────────────────

  it("shows points_invalid toast when max_points is 0", async () => {
    renderDialog();

    const pointsInput = document.querySelector(
      'input[id="sc_max_points"]',
    ) as HTMLInputElement;
    fireEvent.change(pointsInput, { target: { value: "0" } });

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Nombre válido" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockToastError).toHaveBeenCalledWith(t.validation.points_invalid);
  });

  // ── 8. Cap legend + max attribute ────────────────────────────────────────

  it("shows system cap legend and applies max attribute to points input", () => {
    renderDialog({ maxPointsCap: 17 });

    expect(
      screen.getByText(
        "Puntaje máximo permitido por el sistema: 17 puntos por aspecto.",
      ),
    ).toBeInTheDocument();

    const pointsInput = document.querySelector(
      'input[id="sc_max_points"]',
    ) as HTMLInputElement;
    expect(pointsInput).toHaveAttribute("max", "17");
  });

  // ── 9. Validation — maxPoints > cap ──────────────────────────────────────

  it("shows cap validation error when max_points exceeds the configured cap", async () => {
    const { onSave } = renderDialog({ maxPointsCap: 20 });

    const pointsInput = document.querySelector(
      'input[id="sc_max_points"]',
    ) as HTMLInputElement;
    fireEvent.change(pointsInput, { target: { value: "21" } });

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Nombre válido" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Los puntos máximos no pueden superar 20",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  // ── 10. Happy path create — calls onSave without id ──────────────────────

  it("calls onSave with name, max_points but no id in create mode", async () => {
    const { onOpenChange, onSave, onSuccess } = renderDialog();

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Nueva cat" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Nueva cat",
          max_points: 1,
          scoring_mode: "numeric",
        }),
        undefined,
      );
    });

    expect(mockToastSuccess).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(SAVED_CATEGORY);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 11. Happy path edit — calls onSave with existing id ──────────────────

  it("calls onSave with category id in edit mode", async () => {
    const { onSave } = renderDialog({ category: STUB_CATEGORY });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Puntualidad",
          scoring_mode: "numeric",
        }),
        5,
      );
    });
  });

  // ── 12. Error path — shows Error.message in toast ────────────────────────

  it("shows Error.message in toast when onSave throws", async () => {
    const failingSave = vi
      .fn<(payload: unknown, id?: number) => Promise<ScoringCategory>>()
      .mockRejectedValue(new Error("Categoría duplicada"));
    renderDialog({ onSave: failingSave });

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Duplicada" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Categoría duplicada");
    });
  });

  // ── 13. Cancel closes dialog without API call ─────────────────────────────

  it("calls onOpenChange(false) and does NOT call onSave on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSave } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  // ── 14. In-flight state — buttons disabled while saving ───────────────────

  it("disables buttons while save is in flight", async () => {
    let resolve!: (v: ScoringCategory) => void;
    const slowSave = vi
      .fn<(payload: unknown, id?: number) => Promise<ScoringCategory>>()
      .mockReturnValue(
        new Promise<ScoringCategory>((res) => {
          resolve = res;
        }),
      );
    renderDialog({ onSave: slowSave });

    const nameInput = document.querySelector(
      'input[id="sc_name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Lento" } });

    const form = document.querySelector("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolve(SAVED_CATEGORY);
    });
  });
});
