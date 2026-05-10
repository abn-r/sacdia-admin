/**
 * Integration tests for RegisterMemberDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (static schema, no useMemo).
 * It calls `registerCamporeeMember` from `@/lib/api/camporees` (HTTP).
 * We mock the module entirely — no MSW needed.
 *
 * Special behavior:
 *   - Insurance-related errors (containing "seguro"/"insurance"/"póliza")
 *     render a dedicated alert callout (role="alert") instead of toast.
 *   - Generic errors go to toast.error.
 *   - `camporee_type` defaults to "local"; the "union" type shows a hint
 *     on the club_name label.
 *
 * Renders are wrapped in `NextIntlClientProvider` with real `messages/es.json`.
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
const mockRegister = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    registerCamporeeMember: (...args: unknown[]) => mockRegister(...args),
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

import { RegisterMemberDialog } from "@/components/camporees/register-member-dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const t = messages.camporees;
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporeeId?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, camporeeId = 10 } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RegisterMemberDialog
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

describe("RegisterMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Rendering ──────────────────────────────────────────────────────────

  it("renders title, user-id input, camporee-type select, club-name and insurance inputs", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.registerMemberDialog.title }),
    ).toBeInTheDocument();

    // Use placeholder text to find inputs — avoids issues with label + <span> children
    expect(
      screen.getByPlaceholderText("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(t.registerMemberDialog.placeholderClubName),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(t.registerMemberDialog.placeholderInsuranceId),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: t.registerMemberDialog.register }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.registerMemberDialog.cancel }),
    ).toBeInTheDocument();
  });

  // ── 2. Validation — invalid UUID ─────────────────────────────────────────

  it("shows UUID validation error when user_id is not a valid UUID", async () => {
    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: "not-a-uuid" } });
    });

    await submitForm();

    await waitFor(() => {
      // The Zod uuid error is "El ID de usuario debe ser un UUID válido"
      expect(
        screen.getByText(/El ID de usuario debe ser un UUID válido/i),
      ).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 3. Happy path — local camporee ───────────────────────────────────────

  it("calls registerCamporeeMember with correct args for local type", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    // camporee_type defaults to "local" — no change needed

    await submitForm();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledOnce();
    });

    const [camporeeId, payload] = mockRegister.mock.calls[0] as [
      number,
      { user_id: string; camporee_type: string; club_name?: string; insurance_id?: number },
    ];
    expect(camporeeId).toBe(10);
    expect(payload.user_id).toBe(VALID_UUID);
    expect(payload.camporee_type).toBe("local");
    expect(payload.club_name).toBeUndefined();

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.member_registered);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 4. Happy path — union camporee with club name ─────────────────────────

  it("forwards club_name and insurance_id when provided for union type", async () => {
    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    // Switch camporee_type to "union" via the hidden Radix native <select>
    // (only one select in this form — for camporee_type)
    const typeNative = document.querySelector("select") as HTMLSelectElement | null;
    if (typeNative) {
      await act(async () => {
        fireEvent.change(typeNative, { target: { value: "union" } });
      });
    }

    const clubNameInput = document.querySelector('input[name="club_name"]') as HTMLInputElement | null;
    await act(async () => {
      if (clubNameInput) fireEvent.change(clubNameInput, { target: { value: "Club Central" } });
    });

    const insuranceInput = document.querySelector('input[name="insurance_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (insuranceInput) fireEvent.change(insuranceInput, { target: { value: "42" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledOnce();
    });

    const [, payload] = mockRegister.mock.calls[0] as [
      number,
      { camporee_type: string; club_name?: string; insurance_id?: number },
    ];
    expect(payload.camporee_type).toBe("union");
    expect(payload.club_name).toBe("Club Central");
    expect(payload.insurance_id).toBe(42);
  });

  // ── 5. Cancel closes dialog ───────────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: t.registerMemberDialog.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 6. Submit button disabled while in flight ─────────────────────────────

  it("disables submit button while submission is in flight", async () => {
    let resolveRegister!: () => void;
    mockRegister.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveRegister = () => res({ ok: true });
      }),
    );

    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: new RegExp(t.registerMemberDialog.registering, "i"),
        }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveRegister();
    });
  });

  // ── 7. Insurance error — renders dedicated alert callout ─────────────────

  it("shows insurance error callout (not toast) when error message contains 'seguro'", async () => {
    mockRegister.mockRejectedValue(
      new Error("El seguro no está validado para este usuario"),
    );

    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(t.registerMemberDialog.insuranceErrorTitle),
    ).toBeInTheDocument();

    // Toast must NOT be called for insurance errors
    expect(mockToastError).not.toHaveBeenCalled();
  });

  // ── 8. Generic API error — routes to toast ────────────────────────────────

  it("shows toast.error for generic non-insurance errors", async () => {
    mockRegister.mockRejectedValue(new Error("Duplicate member"));

    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Duplicate member");
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ── 9. Fallback translated error ──────────────────────────────────────────

  it("shows fallback translated error when non-Error is thrown", async () => {
    mockRegister.mockRejectedValue("string error");

    renderDialog();

    const userIdInput = document.querySelector('input[name="user_id"]') as HTMLInputElement | null;
    await act(async () => {
      if (userIdInput) fireEvent.change(userIdInput, { target: { value: VALID_UUID } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.register_member);
    });
  });
});
