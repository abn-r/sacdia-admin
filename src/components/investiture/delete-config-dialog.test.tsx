/**
 * Integration tests for DeleteConfigDialog (Investiture).
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Desactivar.
 * On confirm: calls `deleteInvestitureConfig(config.investiture_config_id)`,
 * shows success toast, calls onSuccess() and closes the dialog.
 *
 * The description conditionally shows config details (localFieldName + yearName)
 * when config is provided, or a generic message when config is null.
 *
 * `deleteInvestitureConfig` is mocked at module boundary.
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
const mockDeleteInvestitureConfig = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/investiture", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/investiture")>();
  return {
    ...original,
    deleteInvestitureConfig: (...args: unknown[]) => mockDeleteInvestitureConfig(...args),
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

import { DeleteConfigDialog } from "@/components/investiture/delete-config-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CONFIG: InvestitureConfig = {
  investiture_config_id: 9,
  local_field_id: 3,
  ecclesiastical_year_id: 2026,
  submission_deadline: "2026-11-01",
  investiture_date: "2026-11-30",
  active: true,
  local_fields: { name: "Campo Local Sur" },
  ecclesiastical_years: {
    ecclesiastical_year_id: 2026,
    name: "Año 2026",
  },
};

const STUB_CONFIG_NO_RELATIONS: InvestitureConfig = {
  investiture_config_id: 12,
  local_field_id: 5,
  ecclesiastical_year_id: 2027,
  submission_deadline: "2027-10-01",
  investiture_date: "2027-10-31",
  active: true,
  local_fields: null,
  ecclesiastical_years: null,
};

const t = messages.investiture;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  config?: InvestitureConfig | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, config = STUB_CONFIG, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteConfigDialog
        open={open}
        onOpenChange={onOpenChange}
        config={config}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteConfigDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteInvestitureConfig.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /¿desactivar configuración\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });

  // ── 2. Shows local field and year names in description ───────────────────

  it("shows local field name and year name in description when config is provided", () => {
    renderDialog({ config: STUB_CONFIG });

    expect(screen.getByText(/Campo Local Sur/)).toBeInTheDocument();
    expect(screen.getByText(/Año 2026/)).toBeInTheDocument();
  });

  // ── 3. Fallback names when relations are absent ──────────────────────────

  it("shows fallback field/year labels when local_fields and ecclesiastical_years are null", () => {
    renderDialog({ config: STUB_CONFIG_NO_RELATIONS });

    expect(screen.getByText(/Campo #5/)).toBeInTheDocument();
    expect(screen.getByText(/Año #2027/)).toBeInTheDocument();
  });

  // ── 4. Null config — shows generic description ───────────────────────────

  it("shows generic description when config is null", () => {
    renderDialog({ config: null });

    expect(
      screen.getByText(/desactivará la configuración/i),
    ).toBeInTheDocument();
  });

  // ── 5. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /¿desactivar configuración\?/i }),
    ).not.toBeInTheDocument();
  });

  // ── 6. Null config — early return, no API call ───────────────────────────

  it("does not call deleteInvestitureConfig when config is null", async () => {
    renderDialog({ config: null });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteInvestitureConfig).not.toHaveBeenCalled();
  });

  // ── 7. Happy path — calls deleteInvestitureConfig with config id ─────────

  it("calls deleteInvestitureConfig with investiture_config_id, shows toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ config: STUB_CONFIG });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeleteInvestitureConfig).toHaveBeenCalledWith(9);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.config_deactivated);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 8. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deleteInvestitureConfig on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeleteInvestitureConfig).not.toHaveBeenCalled();
  });

  // ── 9. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error.message when deleteInvestitureConfig throws", async () => {
    mockDeleteInvestitureConfig.mockRejectedValue(new Error("Config conflict"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Config conflict");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 10. API error — falls back to i18n message for non-Error throws ──────

  it("shows i18n fallback error toast when deleteInvestitureConfig throws a non-Error", async () => {
    mockDeleteInvestitureConfig.mockRejectedValue("plain string error");

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.config_deactivate);
    });
  });

  // ── 11. In-flight state — Desactivar button disabled ─────────────────────

  it("disables both buttons while deactivation is in flight", async () => {
    let resolveDeactivate!: () => void;
    mockDeleteInvestitureConfig.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveDeactivate = () => res({ ok: true });
      }),
    );

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      // The Desactivar button gets a Loader2 spinner prepended — stays accessible by name
      expect(screen.getByRole("button", { name: /desactivar/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolveDeactivate();
    });
  });
});
