/**
 * Integration tests for RegisterMemberDialog.
 *
 * The dialog now uses Club → Member selectors and auto-fills insurance from the
 * backend. Selectors are mocked here because this suite verifies dialog submit
 * behavior, not selector internals.
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
// Test constants + mocks
// ---------------------------------------------------------------------------

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ACTIVE_INSURANCE = {
  insurance_id: 42,
  insurance_type: "CAMPOREE",
  policy_number: "POL-42",
  provider: "Seguro Test",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  coverage_amount: 1000,
  active: true,
  evidence_file_url: null,
  evidence_file_name: null,
  created_at: null,
  modified_at: null,
  created_by_name: null,
  modified_by_name: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRegister = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockGetMemberInsurance = vi.fn();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    registerCamporeeMember: (...args: unknown[]) => mockRegister(...args),
  };
});

vi.mock("@/lib/api/insurance", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/insurance")>();
  return {
    ...original,
    getMemberInsuranceFromClient: (...args: unknown[]) =>
      mockGetMemberInsurance(...args),
  };
});

vi.mock("@/components/shared/selectors/club-select", () => ({
  ClubSelect: ({ onChange }: { onChange: (clubId: number | null) => void }) => (
    <button type="button" onClick={() => onChange(1)}>
      Seleccionar club
    </button>
  ),
}));

vi.mock("@/components/units/member-combobox", () => ({
  MemberCombobox: ({
    onChange,
    disabled,
  }: {
    onChange: (userId: string) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(VALID_UUID)}
    >
      Seleccionar miembro
    </button>
  ),
}));

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
// Render helpers
// ---------------------------------------------------------------------------

const t = messages.camporees;

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

async function selectClubAndMember() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Seleccionar club" }));
  await user.click(screen.getByRole("button", { name: "Seleccionar miembro" }));
  await waitFor(() => {
    expect(mockGetMemberInsurance).toHaveBeenCalledWith(VALID_UUID);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RegisterMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockResolvedValue({ ok: true });
    mockGetMemberInsurance.mockResolvedValue(ACTIVE_INSURANCE);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders selector-based fields and no raw ID inputs", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.registerMemberDialog.title }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Seleccionar club" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t.registerMemberDialog.placeholderSelectClubFirst),
    ).toBeVisible();
    expect(
      screen
        .getByText(t.registerMemberDialog.placeholderSelectClubFirst)
        .closest("button"),
    ).toBeDisabled();
    expect(
      document.querySelector('input[name="insurance_id"]'),
    ).not.toBeInTheDocument();
  });

  it("requires selecting a member before submit", async () => {
    renderDialog();

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/Selecciona un miembro válido/i),
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("auto-fills insurance and calls registerCamporeeMember with correct args", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    await selectClubAndMember();
    expect(screen.getByText(/Seguro activo/i)).toBeInTheDocument();

    await submitForm();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledOnce();
    });

    const [camporeeId, payload] = mockRegister.mock.calls[0] as [
      number,
      {
        user_id: string;
        camporee_type: string;
        club_name?: string;
        insurance_id: number;
      },
    ];

    expect(camporeeId).toBe(10);
    expect(payload).toMatchObject({
      user_id: VALID_UUID,
      camporee_type: "local",
      insurance_id: 42,
    });
    expect(payload.club_name).toBeUndefined();

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.member_registered);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("disables submit and shows warning when selected member has no active insurance", async () => {
    mockGetMemberInsurance.mockResolvedValue(null);
    renderDialog();

    await selectClubAndMember();

    await waitFor(() => {
      expect(
        screen.getByText(t.registerMemberDialog.noInsuranceTitle),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: t.registerMemberDialog.register }),
    ).toBeDisabled();
  });

  it("does not submit a HIGH_RISK insurance because it is not eligible for camporees", async () => {
    mockGetMemberInsurance.mockResolvedValue({
      ...ACTIVE_INSURANCE,
      insurance_type: "HIGH_RISK",
    });
    renderDialog();

    await selectClubAndMember();

    await waitFor(() => {
      expect(
        screen.getByText(t.registerMemberDialog.noInsuranceTitle),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: t.registerMemberDialog.register }),
    ).toBeDisabled();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: t.registerMemberDialog.cancel }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("disables submit button while submission is in flight", async () => {
    let resolveRegister!: () => void;
    mockRegister.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveRegister = () => res({ ok: true });
      }),
    );

    renderDialog();
    await selectClubAndMember();
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

  it("shows insurance error callout (not toast) when register API rejects with insurance error", async () => {
    mockRegister.mockRejectedValue(
      new Error("El seguro no está validado para este usuario"),
    );

    renderDialog();
    await selectClubAndMember();
    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(t.registerMemberDialog.insuranceErrorTitle),
    ).toBeInTheDocument();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("shows toast.error for generic non-insurance errors", async () => {
    mockRegister.mockRejectedValue(new Error("Duplicate member"));

    renderDialog();
    await selectClubAndMember();
    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Duplicate member");
    });
  });

  it("shows fallback translated error when non-Error is thrown", async () => {
    mockRegister.mockRejectedValue("string error");

    renderDialog();
    await selectClubAndMember();
    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.register_member);
    });
  });
});
