/**
 * Integration tests for MembershipRejectDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form (no shadcn <Form> wrapper) and
 * calls `rejectMembershipRequest` from `@/lib/api/membership-requests`,
 * which internally hits `apiRequestFromClient` (HTTP). We mock the
 * module entirely so no real network calls happen — MSW remains
 * active but isn't exercised here (consistent with InsuranceFormDialog
 * pattern).
 *
 * The reason field is OPTIONAL (zod `.optional()`), so there is no
 * "required field" validation path — the only happy path is "submit
 * with or without a reason". We assert both flows.
 *
 * Component reads translations via `useTranslations("membership")`,
 * so renders are wrapped in `NextIntlClientProvider` with the real
 * `messages/es.json`.
 *
 * RTL auto-cleanup:
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
import type { MembershipRequest } from "@/lib/api/membership-requests";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog uses ResizeObserver internally)
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReject = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    rejectMembershipRequest: (
      clubSectionId: number,
      assignmentId: string,
      reason?: string,
    ) => mockReject(clubSectionId, assignmentId, reason),
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

import { MembershipRejectDialog } from "@/components/membership/membership-reject-dialog";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_REQUEST: MembershipRequest = {
  assignment_id: "asg-001",
  club_section_id: 42,
  role_id: "role-1",
  status: "PENDING",
  created_at: "2026-01-01T00:00:00.000Z",
  expires_at: null,
  rejection_reason: null,
  users: {
    user_id: "user-001",
    name: "Ana",
    paternal_last_name: "López",
    maternal_last_name: "Torres",
    email: "ana@example.com",
    user_image: null,
  },
  roles: {
    role_id: "role-1",
    role_name: "Conquistador",
  },
};

const dialogMessages = messages.membership.dialogs.reject;
const toastMessages = messages.membership.toasts;
const errorMessages = messages.membership.errors;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  request?: MembershipRequest;
  clubSectionId?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    request = STUB_REQUEST,
    clubSectionId = 42,
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MembershipRejectDialog
        open={open}
        clubSectionId={clubSectionId}
        request={request}
        onOpenChange={onOpenChange}
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

describe("MembershipRejectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReject.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Rendering ──────────────────────────────────────────────────────────

  it("renders title, description with user name, reason field and buttons", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: dialogMessages.title }),
    ).toBeInTheDocument();

    // Description includes interpolated user name
    expect(screen.getByText(/Ana López/i)).toBeInTheDocument();

    // Reason label + textarea
    expect(screen.getByText(dialogMessages.reason_label)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(dialogMessages.reason_placeholder),
    ).toBeInTheDocument();

    // Buttons
    expect(
      screen.getByRole("button", { name: dialogMessages.cancel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dialogMessages.confirm }),
    ).toBeInTheDocument();
  });

  it("falls back to email when name is missing", () => {
    const requestNoName: MembershipRequest = {
      ...STUB_REQUEST,
      users: {
        user_id: "user-002",
        name: null,
        paternal_last_name: null,
        maternal_last_name: null,
        email: "noname@example.com",
        user_image: null,
      },
    };
    renderDialog({ request: requestNoName });

    expect(screen.getByText(/noname@example.com/i)).toBeInTheDocument();
  });

  // ── 2. Cancel ─────────────────────────────────────────────────────────────

  it("calls onOpenChange(false) and does NOT call API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: dialogMessages.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockReject).not.toHaveBeenCalled();
  });

  // ── 3. Happy path WITHOUT reason (optional field) ─────────────────────────

  it("submits without a reason and calls rejectMembershipRequest with undefined reason", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    await submitForm();

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledOnce();
    });

    const [clubSectionId, assignmentId, reason] = mockReject.mock.calls[0] as [
      number,
      string,
      string | undefined,
    ];
    expect(clubSectionId).toBe(42);
    expect(assignmentId).toBe("asg-001");
    expect(reason).toBeUndefined();

    expect(mockToastSuccess).toHaveBeenCalledWith(
      toastMessages.rejected.replace("{name}", "Ana López"),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // ── 4. Happy path WITH reason ─────────────────────────────────────────────

  it("submits with a reason and forwards it to the API", async () => {
    renderDialog();

    const textarea = screen.getByPlaceholderText(
      dialogMessages.reason_placeholder,
    );
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Datos incompletos" } });
    });

    await submitForm();

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledOnce();
    });

    const [, , reason] = mockReject.mock.calls[0] as [
      number,
      string,
      string | undefined,
    ];
    expect(reason).toBe("Datos incompletos");
  });

  // ── 5. Submit during pending: button disabled + loading text ──────────────

  it("disables submit button and shows loading text while in flight", async () => {
    let resolveReject!: () => void;
    mockReject.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveReject = () => res({ ok: true });
      }),
    );

    renderDialog();

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: dialogMessages.confirming }),
      ).toBeDisabled();
    });

    await act(async () => {
      resolveReject();
    });
  });

  // ── 6. API error path: ApiError surfaces server message ───────────────────

  it("shows API error message via toast.error when API throws ApiError", async () => {
    mockReject.mockRejectedValue(new ApiError("Conflict from server", 409, null));

    renderDialog();

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Conflict from server");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 7. API error path: non-ApiError falls back to translated default ──────

  it("shows fallback translated error when API throws a non-ApiError", async () => {
    mockReject.mockRejectedValue(new Error("network down"));

    const { onOpenChange } = renderDialog();
    onOpenChange.mockClear();

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(errorMessages.reject);
    });

    // Dialog stays open on error (onOpenChange(false) not called from submit handler)
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
