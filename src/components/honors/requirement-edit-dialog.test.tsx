/**
 * Integration tests for RequirementEditDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog (not AlertDialog). Form with: displayLabel (max 10 chars),
 * requirementText (required textarea), referenceText (collapsible),
 * isChoiceGroup toggle (shows choiceMin input when on), requiresEvidence
 * toggle, and needsReview toggle (only in edit mode).
 *
 * Uses TanStack Query `useMutation` + `useQueryClient`. Needs QueryClientProvider.
 * Supports two modes: "create" and "edit".
 *
 * `createRequirement` and `updateRequirement` are mocked at module boundary.
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
import type { RequirementNode } from "@/lib/api/honors";

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
const mockCreateRequirement = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateRequirement = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/honors", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/honors")>();
  return {
    ...original,
    createRequirement: (...args: unknown[]) => mockCreateRequirement(...args),
    updateRequirement: (...args: unknown[]) => mockUpdateRequirement(...args),
  };
});

import { RequirementEditDialog } from "@/components/honors/requirement-edit-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_REQUIREMENT: RequirementNode = {
  requirement_id: 77,
  honor_id: 10,
  parent_id: null,
  requirement_number: 3,
  display_label: "3",
  requirement_text: "Conocer los principios básicos",
  reference_text: "Manual pág. 45",
  has_sub_items: false,
  is_choice_group: false,
  choice_min: null,
  requires_evidence: false,
  needs_review: false,
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  modified_at: "2026-01-01T00:00:00Z",
  children: [],
};

const HONOR_ID = 10;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

type DialogMode = "create" | "edit";

interface RenderOpts {
  open?: boolean;
  mode?: DialogMode;
  requirement?: RequirementNode | null;
  nextNumber?: number;
  parentId?: number | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    mode = "create",
    requirement = null,
    nextNumber = 1,
    parentId = null,
    onSuccess,
  } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <RequirementEditDialog
          open={open}
          onOpenChange={onOpenChange}
          mode={mode}
          honorId={HONOR_ID}
          nextNumber={nextNumber}
          parentId={parentId}
          requirement={requirement}
          onSuccess={successCb}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb, queryClient };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RequirementEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRequirement.mockResolvedValue({ requirement_id: 100 });
    mockUpdateRequirement.mockResolvedValue({ requirement_id: 77 });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode renders correct title ─────────────────────────────────

  it("renders 'Agregar requisito' title in create mode", () => {
    renderDialog({ mode: "create" });

    expect(
      screen.getByRole("heading", { name: /agregar requisito/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode renders correct title ──────────────────────────────────

  it("renders 'Editar requisito' title in edit mode", () => {
    renderDialog({ mode: "edit", requirement: STUB_REQUIREMENT });

    expect(
      screen.getByRole("heading", { name: /editar requisito/i }),
    ).toBeInTheDocument();
  });

  // ── 3. Sub-requirement create mode title ────────────────────────────────

  it("renders 'Agregar sub-requisito' title when parentId is set in create mode", () => {
    renderDialog({ mode: "create", parentId: 5 });

    expect(
      screen.getByRole("heading", { name: /agregar sub-requisito/i }),
    ).toBeInTheDocument();
  });

  // ── 4. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /agregar requisito/i }),
    ).not.toBeInTheDocument();
  });

  // ── 5. Edit mode pre-fills form fields ───────────────────────────────────

  it("pre-fills form fields from requirement in edit mode", () => {
    renderDialog({ mode: "edit", requirement: STUB_REQUIREMENT });

    const displayLabelInput = document.querySelector<HTMLInputElement>("#displayLabel");
    expect(displayLabelInput?.value).toBe("3");

    const requirementTextArea = document.querySelector<HTMLTextAreaElement>("#requirementText");
    expect(requirementTextArea?.value).toBe("Conocer los principios básicos");
  });

  // ── 6. Validation — empty requirementText shows error ────────────────────

  it("shows validation error when requirementText is empty on submit", async () => {
    renderDialog({ mode: "create" });

    // Submit the form directly — avoids ambiguity with the "Agregar referencia" button
    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/texto del requisito es obligatorio/i),
      ).toBeInTheDocument();
    });

    expect(mockCreateRequirement).not.toHaveBeenCalled();
  });

  // ── 7. Happy path create — calls createRequirement ───────────────────────

  it("calls createRequirement and closes on valid create submission", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ mode: "create", nextNumber: 5 });

    const textArea = document.querySelector<HTMLTextAreaElement>("#requirementText");
    await act(async () => {
      fireEvent.change(textArea!, { target: { value: "Nuevo requisito de prueba" } });
    });

    // Submit via form — avoids ambiguity between "Agregar" submit and "Agregar referencia" button
    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockCreateRequirement).toHaveBeenCalledWith(
        HONOR_ID,
        expect.objectContaining({
          requirementText: "Nuevo requisito de prueba",
          requirementNumber: 5,
        }),
      );
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 8. Happy path edit — calls updateRequirement ─────────────────────────

  it("calls updateRequirement and closes on valid edit submission", async () => {
    const { onOpenChange, onSuccess } = renderDialog({
      mode: "edit",
      requirement: STUB_REQUIREMENT,
    });

    const textArea = document.querySelector<HTMLTextAreaElement>("#requirementText");
    await act(async () => {
      fireEvent.change(textArea!, { target: { value: "Requisito actualizado" } });
    });

    const submitBtn = screen.getByRole("button", { name: /guardar cambios/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockUpdateRequirement).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          requirementText: "Requisito actualizado",
        }),
      );
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 9. Cancel closes dialog without API call ─────────────────────────────

  it("calls onOpenChange(false) and does NOT call API on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ mode: "create" });

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateRequirement).not.toHaveBeenCalled();
  });

  // ── 10. isChoiceGroup toggle shows/hides choiceMin input ─────────────────

  it("shows choiceMin input when isChoiceGroup is toggled on", async () => {
    renderDialog({ mode: "create" });

    expect(screen.queryByLabelText(/mínimo de opciones/i)).not.toBeInTheDocument();

    const choiceGroupSwitch = document.querySelector<HTMLButtonElement>("#isChoiceGroup");
    await act(async () => {
      fireEvent.click(choiceGroupSwitch!);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/mínimo de opciones/i)).toBeInTheDocument();
    });
  });

  // ── 11. needsReview toggle only visible in edit mode ─────────────────────

  it("shows needsReview toggle only in edit mode", () => {
    const { unmount } = renderDialog({ mode: "edit", requirement: STUB_REQUIREMENT });
    expect(screen.getByLabelText(/pendiente de revisión/i)).toBeInTheDocument();
    unmount();

    renderDialog({ mode: "create" });
    expect(screen.queryByLabelText(/pendiente de revisión/i)).not.toBeInTheDocument();
  });

  // ── 12. In-flight — submit button shows Guardando... ─────────────────────

  it("shows 'Guardando...' label while mutation is in flight", async () => {
    let resolveCreate!: () => void;
    mockCreateRequirement.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveCreate = () => res({ requirement_id: 100 });
      }),
    );

    renderDialog({ mode: "create" });

    const textArea = document.querySelector<HTMLTextAreaElement>("#requirementText");
    await act(async () => {
      fireEvent.change(textArea!, { target: { value: "Texto de prueba" } });
    });

    // Submit via form to avoid ambiguity with "Agregar referencia bibliográfica" button
    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
    });

    await act(async () => {
      resolveCreate();
    });
  });
});
