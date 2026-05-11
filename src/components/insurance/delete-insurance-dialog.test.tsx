/**
 * Integration tests for DeleteInsuranceDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * AlertDialog (no React Hook Form). Two buttons: Cancelar / Desactivar.
 * Action: deactivateInsurance(member.insurance.insurance_id).
 * Guards: exits early if insurance_id is undefined.
 * Member name is derived from name + paternal_last_name + maternal_last_name.
 *
 * `deactivateInsurance` is mocked at module boundary.
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
import type { MemberInsurance } from "@/lib/api/insurance";

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
const mockDeactivateInsurance = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/insurance", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/insurance")>();
  return {
    ...original,
    deactivateInsurance: (...args: unknown[]) => mockDeactivateInsurance(...args),
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

import { DeleteInsuranceDialog } from "@/components/insurance/delete-insurance-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_MEMBER: MemberInsurance = {
  user_id: "user-abc-123",
  name: "Ana",
  paternal_last_name: "García",
  maternal_last_name: "López",
  user_image: null,
  insurance: {
    insurance_id: 55,
    insurance_type: "GENERAL_ACTIVITIES",
    policy_number: "POL-2026-001",
    provider: "Aseguradora XYZ",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    coverage_amount: 10000,
    active: true,
    evidence_file_url: null,
    evidence_file_name: null,
    created_at: null,
    modified_at: null,
    created_by_name: null,
    modified_by_name: null,
  },
};

const STUB_MEMBER_NO_INSURANCE: MemberInsurance = {
  user_id: "user-xyz-456",
  name: "Luis",
  paternal_last_name: "Martínez",
  maternal_last_name: null,
  user_image: null,
  insurance: null,
};

const t = messages.insurance;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  member?: MemberInsurance | null;
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, member = STUB_MEMBER, onSuccess } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DeleteInsuranceDialog
        open={open}
        onOpenChange={onOpenChange}
        member={member}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeleteInsuranceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeactivateInsurance.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and buttons ─────────────────────────────────────────

  it("renders title, cancel and confirm buttons when open", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /¿desactivar seguro\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });

  // ── 2. Shows full member name in description ─────────────────────────────

  it("shows full member name (name + paternal + maternal) in description", () => {
    renderDialog({ member: STUB_MEMBER });

    expect(screen.getByText(/Ana García López/)).toBeInTheDocument();
    expect(screen.getByText(/El registro se conservará/i)).toBeInTheDocument();
  });

  // ── 3. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /¿desactivar seguro\?/i }),
    ).not.toBeInTheDocument();
  });

  // ── 4. No insurance_id — early return, no API call ───────────────────────

  it("does not call deactivateInsurance when member has no insurance", async () => {
    renderDialog({ member: STUB_MEMBER_NO_INSURANCE });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeactivateInsurance).not.toHaveBeenCalled();
  });

  // ── 5. Null member — early return, no API call ───────────────────────────

  it("does not call deactivateInsurance when member is null", async () => {
    renderDialog({ member: null });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeactivateInsurance).not.toHaveBeenCalled();
  });

  // ── 6. Happy path — calls deactivateInsurance with insurance_id ──────────

  it("calls deactivateInsurance with insurance_id, shows success toast, calls onSuccess and closes", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ member: STUB_MEMBER });

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockDeactivateInsurance).toHaveBeenCalledWith(55);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.deactivated);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 7. Cancel does not call API ──────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call deactivateInsurance on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockDeactivateInsurance).not.toHaveBeenCalled();
  });

  // ── 8. API error — shows error message from Error instance ───────────────

  it("shows error toast from Error.message when deactivateInsurance throws", async () => {
    mockDeactivateInsurance.mockRejectedValue(new Error("Insurance not found"));

    const { onSuccess } = renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Insurance not found");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 9. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when deactivateInsurance throws a non-Error", async () => {
    mockDeactivateInsurance.mockRejectedValue({ status: 500 });

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /desactivar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.deactivate_failed);
    });
  });

  // ── 10. In-flight state — buttons disabled while deactivating ─────────────

  it("disables both buttons while deactivation is in flight", async () => {
    let resolveDeactivate!: () => void;
    mockDeactivateInsurance.mockReturnValue(
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
      expect(screen.getByRole("button", { name: /desactivando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolveDeactivate();
    });
  });

  // ── 11. Member name fallback — only name when no last names ──────────────

  it("shows just the name when paternal and maternal last names are absent", () => {
    const memberNameOnly: MemberInsurance = {
      ...STUB_MEMBER_NO_INSURANCE,
      name: "Carlos",
      paternal_last_name: null,
      maternal_last_name: null,
      insurance: { ...STUB_MEMBER.insurance! },
    };

    renderDialog({ member: memberNameOnly });

    // Description contains the name
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });
});
