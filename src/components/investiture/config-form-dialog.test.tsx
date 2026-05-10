/**
 * Integration tests for ConfigFormDialog (investiture configuration).
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod. On open it calls:
 *   - `listLocalFields()` from `@/lib/api/geography`
 *   - `listEcclesiasticalYears()` from `@/lib/api/catalogs`
 * On submit (create) it calls `createInvestitureConfig` from
 * `@/lib/api/investiture` (which internally uses `apiRequestFromClient`).
 * On submit (edit) it calls `updateInvestitureConfig`.
 *
 * We mock all three modules entirely — no MSW exercised.
 *
 * Create mode: local_field_id and ecclesiastical_year_id selects are shown.
 * Edit mode:   only date fields are editable; select fields are hidden.
 *
 * Translations are used for validation messages (from useTranslations("investiture")).
 * Hardcoded strings are used for title/button text (no i18n key).
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
import type { InvestitureConfig } from "@/lib/api/investiture";
import type { LocalField } from "@/lib/api/geography";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";

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
const mockCreateConfig = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateConfig = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/investiture", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/investiture")>();
  return {
    ...original,
    createInvestitureConfig: (...args: unknown[]) => mockCreateConfig(...args),
    updateInvestitureConfig: (...args: unknown[]) => mockUpdateConfig(...args),
  };
});

const mockListLocalFields = vi.fn<() => Promise<LocalField[]>>();
vi.mock("@/lib/api/geography", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/geography")>();
  return {
    ...original,
    listLocalFields: () => mockListLocalFields(),
  };
});

const mockListEcclesiasticalYears = vi.fn<() => Promise<EcclesiasticalYear[]>>();
vi.mock("@/lib/api/catalogs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/catalogs")>();
  return {
    ...original,
    listEcclesiasticalYears: () => mockListEcclesiasticalYears(),
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

import { ConfigFormDialog } from "@/components/investiture/config-form-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_LOCAL_FIELDS: LocalField[] = [
  { local_field_id: 1, name: "Campo Norte", union_id: 1 },
  { local_field_id: 2, name: "Campo Sur", union_id: 1 },
];

const STUB_YEARS: EcclesiasticalYear[] = [
  {
    ecclesiastical_year_id: 10,
    name: "2025",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    active: true,
  },
  {
    ecclesiastical_year_id: 11,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: false,
  },
];

const STUB_CONFIG: InvestitureConfig = {
  investiture_config_id: 50,
  local_field_id: 1,
  ecclesiastical_year_id: 10,
  submission_deadline: "2026-08-01T00:00:00.000Z",
  investiture_date: "2026-09-15T00:00:00.000Z",
  active: true,
};

const STUB_CREATED_CONFIG: InvestitureConfig = {
  ...STUB_CONFIG,
  investiture_config_id: 99,
};

const inv = messages.investiture;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  config?: InvestitureConfig | null;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, config = null } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ConfigFormDialog
        open={open}
        onOpenChange={onOpenChange}
        config={config}
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfigFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListLocalFields.mockResolvedValue(STUB_LOCAL_FIELDS);
    mockListEcclesiasticalYears.mockResolvedValue(STUB_YEARS);
    mockCreateConfig.mockResolvedValue(STUB_CREATED_CONFIG);
    mockUpdateConfig.mockResolvedValue(STUB_CONFIG);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode — rendering and catalog load ───────────────────────────

  it("renders create mode title and loads catalog selects on open", async () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /Nueva configuración/i }),
    ).toBeInTheDocument();

    // Date inputs are rendered (query by name attr — shadcn FormControl uses dynamic IDs)
    expect(document.querySelector('input[name="submission_deadline"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="investiture_date"]')).toBeInTheDocument();

    // Wait for catalogs to load and verify API was called
    await waitFor(() => {
      expect(mockListLocalFields).toHaveBeenCalledOnce();
      expect(mockListEcclesiasticalYears).toHaveBeenCalledOnce();
    });

    expect(
      screen.getByRole("button", { name: /Crear configuración/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode — rendering ──────────────────────────────────────────────

  it("renders edit mode title without catalog selects, only date fields", async () => {
    renderDialog({ config: STUB_CONFIG });

    expect(
      screen.getByRole("heading", { name: /Editar configuración/i }),
    ).toBeInTheDocument();

    // In edit mode, Radix catalog selects are not rendered — no native <select> elements
    expect(document.querySelectorAll("select").length).toBe(0);

    // Date inputs are shown and pre-filled (query by name attr)
    const deadlineInput = document.querySelector('input[name="submission_deadline"]') as HTMLInputElement | null;
    const dateInput = document.querySelector('input[name="investiture_date"]') as HTMLInputElement | null;

    expect(deadlineInput).not.toBeNull();
    expect(dateInput).not.toBeNull();

    // Pre-fill: submission_deadline = "2026-08-01T00:00:00.000Z" → "2026-08-01"
    expect(deadlineInput?.value).toBe("2026-08-01");
    expect(dateInput?.value).toBe("2026-09-15");

    expect(
      screen.getByRole("button", { name: /Guardar cambios/i }),
    ).toBeInTheDocument();
  });

  // ── 3. Validation — empty date fields on create ───────────────────────────

  it("shows validation errors when date fields are empty on submit", async () => {
    renderDialog();

    // Wait for catalogs to load
    await waitFor(() => expect(mockListLocalFields).toHaveBeenCalled());

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(inv.validation.submission_deadline_required),
      ).toBeInTheDocument();
      expect(
        screen.getByText(inv.validation.investiture_date_required),
      ).toBeInTheDocument();
    });

    expect(mockCreateConfig).not.toHaveBeenCalled();
  });

  // ── 4. Happy path — create config ────────────────────────────────────────

  it("calls createInvestitureConfig with correct payload and shows success toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    // Wait for catalogs to load
    await waitFor(() => expect(mockListLocalFields).toHaveBeenCalled());

    // Radix renders hidden native <select> elements (no name attr here).
    // In create mode: allNativeSelects[0] = local_field, allNativeSelects[1] = ecclesiastical_year.
    const allNativeSelects = document.querySelectorAll("select");
    const localFieldNative = allNativeSelects[0] as HTMLSelectElement | undefined;
    const yearNative = allNativeSelects[1] as HTMLSelectElement | undefined;

    if (localFieldNative) {
      await act(async () => {
        fireEvent.change(localFieldNative, { target: { value: "1" } });
      });
    }

    if (yearNative) {
      await act(async () => {
        fireEvent.change(yearNative, { target: { value: "10" } });
      });
    }

    // Fill date fields by name attr (shadcn FormControl generates dynamic IDs)
    const deadlineInput = document.querySelector('input[name="submission_deadline"]') as HTMLInputElement | null;
    const dateInput = document.querySelector('input[name="investiture_date"]') as HTMLInputElement | null;
    await act(async () => {
      if (deadlineInput) fireEvent.change(deadlineInput, { target: { value: "2026-08-01" } });
      if (dateInput) fireEvent.change(dateInput, { target: { value: "2026-09-15" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalledOnce();
    });

    const [payload] = mockCreateConfig.mock.calls[0] as [
      {
        local_field_id: number;
        ecclesiastical_year_id: number;
        submission_deadline: string;
        investiture_date: string;
      },
    ];
    expect(payload.submission_deadline).toBe("2026-08-01");
    expect(payload.investiture_date).toBe("2026-09-15");

    expect(mockToastSuccess).toHaveBeenCalledWith(inv.toasts.config_created);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 5. Happy path — edit config ───────────────────────────────────────────

  it("calls updateInvestitureConfig (not create) in edit mode and shows update toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ config: STUB_CONFIG });

    const deadlineInput = document.querySelector('input[name="submission_deadline"]') as HTMLInputElement | null;
    await act(async () => {
      if (deadlineInput) fireEvent.change(deadlineInput, { target: { value: "2026-07-15" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledOnce();
    });

    expect(mockCreateConfig).not.toHaveBeenCalled();

    const [configId, payload] = mockUpdateConfig.mock.calls[0] as [
      number,
      { submission_deadline: string; investiture_date: string },
    ];
    expect(configId).toBe(50);
    expect(payload.submission_deadline).toBe("2026-07-15");

    expect(mockToastSuccess).toHaveBeenCalledWith(inv.toasts.config_updated);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 6. Cancel closes dialog without API call ──────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateConfig).not.toHaveBeenCalled();
    expect(mockUpdateConfig).not.toHaveBeenCalled();
  });

  // ── 7. Submit button disabled while in flight (edit mode) ─────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveUpdate!: () => void;
    mockUpdateConfig.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveUpdate = () => res(STUB_CONFIG);
      }),
    );

    renderDialog({ config: STUB_CONFIG });

    // Pre-fill dates to ensure form validates
    const deadlineInput = document.querySelector('input[name="submission_deadline"]') as HTMLInputElement | null;
    const dateInput = document.querySelector('input[name="investiture_date"]') as HTMLInputElement | null;
    await act(async () => {
      if (deadlineInput) fireEvent.change(deadlineInput, { target: { value: "2026-08-01" } });
      if (dateInput) fireEvent.change(dateInput, { target: { value: "2026-09-15" } });
    });

    await submitForm();

    await waitFor(() => {
      // Button should be disabled while in flight
      const submitBtn = screen.getByRole("button", { name: /Guardar cambios/i });
      expect(submitBtn).toBeDisabled();
    });

    await act(async () => {
      resolveUpdate();
    });
  });

  // ── 8. Catalog load failure — shows error toast ───────────────────────────

  it("shows catalogs_load_failed toast when catalog APIs reject", async () => {
    mockListLocalFields.mockRejectedValue(new Error("Network error"));
    mockListEcclesiasticalYears.mockRejectedValue(new Error("Network error"));

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(inv.toasts.catalogs_load_failed);
    });
  });

  // ── 9. API error — error message from thrown Error ────────────────────────

  it("shows error toast with server message when updateInvestitureConfig throws", async () => {
    mockUpdateConfig.mockRejectedValue(new Error("Config conflict"));

    renderDialog({ config: STUB_CONFIG });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Config conflict");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 10. API error — fallback translated error ─────────────────────────────

  it("shows fallback translated error when createInvestitureConfig throws non-Error", async () => {
    mockCreateConfig.mockRejectedValue("unexpected");

    renderDialog();

    // Wait for catalogs
    await waitFor(() => expect(mockListLocalFields).toHaveBeenCalled());

    // Fill selects positionally (no name attr on Radix selects)
    const allNativeSelects = document.querySelectorAll("select");
    const localFieldNative = allNativeSelects[0] as HTMLSelectElement | undefined;
    const yearNative = allNativeSelects[1] as HTMLSelectElement | undefined;

    if (localFieldNative) {
      await act(async () => {
        fireEvent.change(localFieldNative, { target: { value: "1" } });
      });
    }
    if (yearNative) {
      await act(async () => {
        fireEvent.change(yearNative, { target: { value: "10" } });
      });
    }

    const deadlineInput = document.querySelector('input[name="submission_deadline"]') as HTMLInputElement | null;
    const dateInput = document.querySelector('input[name="investiture_date"]') as HTMLInputElement | null;
    await act(async () => {
      if (deadlineInput) fireEvent.change(deadlineInput, { target: { value: "2026-08-01" } });
      if (dateInput) fireEvent.change(dateInput, { target: { value: "2026-09-15" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(inv.errors.config_create);
    });
  });
});
