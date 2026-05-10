/**
 * Integration tests for EnrollClubDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog uses React Hook Form + Zod. Single field: club_section_id
 * (coerced number, must be positive integer). Calls `enrollClub` from
 * `@/lib/api/camporees` on submit.
 *
 * The form uses plain `register()` (not shadcn Form/FormControl), so
 * `input[name="club_section_id"]` is stable across React.useId changes.
 *
 * Error messages are raw Zod messages (not from i18n), so we match
 * via regex against the schema literals in the dialog source.
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
const mockEnrollClub = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    enrollClub: (...args: unknown[]) => mockEnrollClub(...args),
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

import { EnrollClubDialog } from "@/components/camporees/enroll-club-dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const t = messages.camporees;
const CAMPOREE_ID = 7;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporeeId?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, camporeeId = CAMPOREE_ID } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EnrollClubDialog
        open={open}
        onOpenChange={onOpenChange}
        camporeeId={camporeeId}
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

describe("EnrollClubDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollClub.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and club_section_id input ────────────────────

  it("renders dialog title, section id input, and action buttons", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.enrollDialog.title }),
    ).toBeInTheDocument();

    // RHF registers with name="club_section_id" — use stable selector
    expect(
      document.querySelector('input[name="club_section_id"]'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: t.enrollDialog.cancel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.enrollDialog.enroll }),
    ).toBeInTheDocument();
  });

  // ── 2. Dialog not rendered when closed ───────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: t.enrollDialog.title }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Validation — empty submit shows error ──────────────────────────────

  it("shows zod validation error when club_section_id is empty on submit", async () => {
    renderDialog();

    await submitForm();

    await waitFor(() => {
      // Zod coerce.number on empty string yields NaN → positive fails
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(mockEnrollClub).not.toHaveBeenCalled();
  });

  // ── 4. Validation — zero value is invalid ────────────────────────────────

  it("shows error when club_section_id is 0 (must be positive)", async () => {
    renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "0" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      // "Debe ser mayor a cero" or "Debe ser un número entero"
      expect(screen.getByText(/debe ser/i)).toBeInTheDocument();
    });

    expect(mockEnrollClub).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — submits with correct payload ──────────────────────────

  it("calls enrollClub with correct camporeeId and club_section_id on valid submit", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "42" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockEnrollClub).toHaveBeenCalledOnce();
    });

    const [camporeeId, payload] = mockEnrollClub.mock.calls[0] as [
      number,
      { club_section_id: number },
    ];
    expect(camporeeId).toBe(CAMPOREE_ID);
    expect(payload.club_section_id).toBe(42);

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.club_enrolled);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel button triggers onOpenChange(false) without API call ────────

  it("calls onOpenChange(false) without calling API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: t.enrollDialog.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockEnrollClub).not.toHaveBeenCalled();
  });

  // ── 7. API Error — uses error.message from Error instance ────────────────

  it("shows error.message toast when enrollClub throws an Error", async () => {
    mockEnrollClub.mockRejectedValue(new Error("Club ya inscrito"));

    renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "10" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Club ya inscrito");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 8. API Error — fallback translated message for non-Error ─────────────

  it("shows fallback translated error when enrollClub throws non-Error value", async () => {
    mockEnrollClub.mockRejectedValue("unexpected string");

    renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "5" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.enroll_club);
    });
  });

  // ── 9. Submit button disabled while in flight ─────────────────────────────

  it("disables submit button while enrollment is in flight", async () => {
    let resolveEnroll!: () => void;
    mockEnrollClub.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveEnroll = () => res({ ok: true });
      }),
    );

    renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "15" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: new RegExp(t.enrollDialog.enrolling, "i") }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveEnroll();
    });
  });

  // ── 10. Cancel resets the form ────────────────────────────────────────────

  it("resets input value to empty after cancel (form reset on close)", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    const input = document.querySelector(
      'input[name="club_section_id"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "99" } });
    });

    // Clicking cancel triggers handleOpenChange(false) which calls reset()
    await user.click(screen.getByRole("button", { name: t.enrollDialog.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
