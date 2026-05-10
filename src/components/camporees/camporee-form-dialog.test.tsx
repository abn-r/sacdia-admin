/**
 * Integration tests for CamporeeFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (schema built inside component via
 * buildSchema factory). It calls `createCamporee` or `updateCamporee` from
 * `@/lib/api/camporees` (HTTP). We mock the module entirely — MSW is active
 * per vitest.setup but is not exercised here (no fetch path).
 *
 * Two modes:
 *   - Create: empty form, submit calls createCamporee
 *   - Edit:   pre-filled from camporee prop, submit calls updateCamporee
 *
 * Checkboxes are Radix Checkbox components (not native) — toggled via
 * fireEvent.click on the rendered button element.
 *
 * Renders are wrapped in `NextIntlClientProvider` with the real `messages/es.json`.
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
const mockCreateCamporee = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateCamporee = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    createCamporee: (...args: unknown[]) => mockCreateCamporee(...args),
    updateCamporee: (...args: unknown[]) => mockUpdateCamporee(...args),
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

import { CamporeeFormDialog } from "@/components/camporees/camporee-form-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CAMPOREE: Camporee = {
  camporee_id: 7,
  name: "Camporee Primavera",
  description: "Descripción de prueba",
  start_date: "2026-05-10T00:00:00.000Z",
  end_date: "2026-05-15T00:00:00.000Z",
  local_camporee_place: "Parque Nacional",
  local_field_id: 3,
  registration_cost: 250,
  includes_adventurers: true,
  includes_pathfinders: true,
  includes_master_guides: false,
};

const t = messages.camporees;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporee?: Camporee | null;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, camporee = null } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeFormDialog
        open={open}
        onOpenChange={onOpenChange}
        camporee={camporee}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

async function submitForm() {
  const form = document.querySelector("form")!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

// Fill all required fields with valid values (create mode)
async function fillRequiredFields() {
  await act(async () => {
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    if (nameInput) fireEvent.change(nameInput, { target: { value: "Camporee Test" } });

    const startInput = document.querySelector('input[name="start_date"]') as HTMLInputElement | null;
    if (startInput) fireEvent.change(startInput, { target: { value: "2026-07-01" } });

    const endInput = document.querySelector('input[name="end_date"]') as HTMLInputElement | null;
    if (endInput) fireEvent.change(endInput, { target: { value: "2026-07-05" } });

    const placeInput = document.querySelector('input[name="local_camporee_place"]') as HTMLInputElement | null;
    if (placeInput) fireEvent.change(placeInput, { target: { value: "Lugar de prueba" } });

    const fieldIdInput = document.querySelector('input[name="local_field_id"]') as HTMLInputElement | null;
    if (fieldIdInput) fireEvent.change(fieldIdInput, { target: { value: "2" } });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CamporeeFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCamporee.mockResolvedValue({ ok: true });
    mockUpdateCamporee.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode — rendering ────────────────────────────────────────────

  it("renders create mode title, required inputs, checkboxes, and buttons", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.form.titleCreate }),
    ).toBeInTheDocument();

    // Required text inputs (query by name attr — RHF spreads name via {...register()})
    expect(document.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="start_date"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="end_date"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="local_camporee_place"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="local_field_id"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="registration_cost"]')).toBeInTheDocument();

    // Club type checkboxes by label text
    expect(screen.getByText(t.form.adventurers)).toBeInTheDocument();
    expect(screen.getByText(t.form.pathfinders)).toBeInTheDocument();
    expect(screen.getByText(t.form.masterGuides)).toBeInTheDocument();

    // Buttons
    expect(
      screen.getByRole("button", { name: t.form.createCamporee }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.form.cancel }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode — pre-fills form with camporee data ──────────────────────

  it("renders edit mode title and pre-fills inputs from camporee prop", () => {
    renderDialog({ camporee: STUB_CAMPOREE });

    expect(
      screen.getByRole("heading", { name: t.form.titleEdit }),
    ).toBeInTheDocument();

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    expect(nameInput?.value).toBe("Camporee Primavera");

    // ISO date is sliced to "YYYY-MM-DD"
    const startInput = document.querySelector('input[name="start_date"]') as HTMLInputElement | null;
    expect(startInput?.value).toBe("2026-05-10");

    const endInput = document.querySelector('input[name="end_date"]') as HTMLInputElement | null;
    expect(endInput?.value).toBe("2026-05-15");

    const placeInput = document.querySelector('input[name="local_camporee_place"]') as HTMLInputElement | null;
    expect(placeInput?.value).toBe("Parque Nacional");

    expect(
      screen.getByRole("button", { name: t.form.saveChanges }),
    ).toBeInTheDocument();
  });

  // ── 3. Validation — required fields empty ────────────────────────────────

  it("shows validation errors when required fields are empty on submit", async () => {
    renderDialog();

    await submitForm();

    await waitFor(() => {
      // Zod error messages rendered as role="alert" paragraphs
      expect(
        screen.getByText(new RegExp(messages.camporees.validation.name_required, "i")),
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(messages.camporees.validation.start_date_required, "i")),
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(messages.camporees.validation.end_date_required, "i")),
      ).toBeInTheDocument();
    });

    expect(mockCreateCamporee).not.toHaveBeenCalled();
  });

  // ── 4. Validation — end date before start date ───────────────────────────

  it("shows end_date_after_start error when end_date precedes start_date", async () => {
    renderDialog();

    await act(async () => {
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
      if (nameInput) fireEvent.change(nameInput, { target: { value: "Test" } });

      const startInput = document.querySelector('input[name="start_date"]') as HTMLInputElement | null;
      if (startInput) fireEvent.change(startInput, { target: { value: "2026-07-10" } });

      // end before start
      const endInput = document.querySelector('input[name="end_date"]') as HTMLInputElement | null;
      if (endInput) fireEvent.change(endInput, { target: { value: "2026-07-05" } });

      const placeInput = document.querySelector('input[name="local_camporee_place"]') as HTMLInputElement | null;
      if (placeInput) fireEvent.change(placeInput, { target: { value: "Lugar" } });

      const fieldIdInput = document.querySelector('input[name="local_field_id"]') as HTMLInputElement | null;
      if (fieldIdInput) fireEvent.change(fieldIdInput, { target: { value: "1" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(messages.camporees.validation.end_date_after_start_full, "i")),
      ).toBeInTheDocument();
    });

    expect(mockCreateCamporee).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — create camporee ──────────────────────────────────────

  it("calls createCamporee with correct payload and shows success toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    await fillRequiredFields();
    await submitForm();

    await waitFor(() => {
      expect(mockCreateCamporee).toHaveBeenCalledOnce();
    });

    const [payload] = mockCreateCamporee.mock.calls[0] as [
      {
        name: string;
        start_date: string;
        end_date: string;
        local_camporee_place: string;
        local_field_id: number;
      },
    ];
    expect(payload.name).toBe("Camporee Test");
    expect(payload.start_date).toBe("2026-07-01");
    expect(payload.end_date).toBe("2026-07-05");
    expect(payload.local_camporee_place).toBe("Lugar de prueba");
    expect(payload.local_field_id).toBe(2);

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.camporee_created);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Happy path — edit camporee ────────────────────────────────────────

  it("calls updateCamporee (not create) in edit mode and shows update toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ camporee: STUB_CAMPOREE });

    // Change name field
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    await act(async () => {
      if (nameInput) fireEvent.change(nameInput, { target: { value: "Nuevo Nombre" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateCamporee).toHaveBeenCalledOnce();
    });

    expect(mockCreateCamporee).not.toHaveBeenCalled();

    const [camporeeId, payload] = mockUpdateCamporee.mock.calls[0] as [
      number,
      { name: string },
    ];
    expect(camporeeId).toBe(7);
    expect(payload.name).toBe("Nuevo Nombre");

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.camporee_updated);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 7. Cancel closes dialog without API call ──────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: t.form.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateCamporee).not.toHaveBeenCalled();
    expect(mockUpdateCamporee).not.toHaveBeenCalled();
  });

  // ── 8. Submit button disabled while in flight ─────────────────────────────

  it("disables submit button while submission is in flight (edit mode)", async () => {
    let resolveUpdate!: () => void;
    mockUpdateCamporee.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveUpdate = () => res({ ok: true });
      }),
    );

    renderDialog({ camporee: STUB_CAMPOREE });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: new RegExp(t.form.saving, "i") }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveUpdate();
    });
  });

  // ── 9. API error — shows server error message ─────────────────────────────

  it("shows error toast with server message when createCamporee throws", async () => {
    mockCreateCamporee.mockRejectedValue(new Error("Name already taken"));

    renderDialog();

    await fillRequiredFields();
    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Name already taken");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 10. API error — fallback translated message ───────────────────────────

  it("shows fallback translated error when createCamporee throws non-Error", async () => {
    mockCreateCamporee.mockRejectedValue("unexpected string");

    renderDialog();

    await fillRequiredFields();
    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.save_camporee);
    });
  });
});
