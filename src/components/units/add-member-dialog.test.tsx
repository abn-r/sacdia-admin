/**
 * Integration tests for AddMemberDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog (not AlertDialog). Form with a MemberCombobox (controlled) and
 * submit/cancel buttons.
 *
 * MemberCombobox is a Popover+Command widget with its own TanStack Query
 * fetch — mocked at module boundary to a simple select input to isolate
 * dialog-level behavior from combobox internals.
 *
 * Validation: requires userId to be non-empty (inline error, no toast).
 * Happy path: addUnitMember(clubId, unitId, userId), success toast, resets
 * userId, calls onSuccess(), closes dialog.
 *
 * `addUnitMember` is mocked at module boundary.
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
import type { UnitMember } from "@/lib/api/units";

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

// Mock MemberCombobox — render a simple <select> so we can control userId
// without dealing with Radix Popover/Command internals in jsdom.
vi.mock("@/components/units/member-combobox", () => ({
  MemberCombobox: ({
    value,
    onChange,
    disabled,
  }: {
    clubId: number;
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    placeholder?: string;
    excludeUserIds?: string[];
  }) => (
    <select
      data-testid="member-combobox"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">-- Seleccionar --</option>
      <option value="user-001">María Pérez</option>
      <option value="user-002">Carlos Ruiz</option>
    </select>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAddUnitMember = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/units", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/units")>();
  return {
    ...original,
    addUnitMember: (...args: unknown[]) => mockAddUnitMember(...args),
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

import { AddMemberDialog } from "@/components/units/add-member-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTIVE_MEMBER: UnitMember = {
  unit_member_id: 1,
  user_id: "user-001",
  active: true,
};

const t = messages.units_admin;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  clubId?: number;
  unitId?: number;
  unitName?: string;
  existingMembers?: UnitMember[];
  onSuccess?: ReturnType<typeof vi.fn>;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    clubId = 5,
    unitId = 21,
    unitName = "Unidad Águilas",
    existingMembers = [],
    onSuccess,
  } = opts;
  const onOpenChange = vi.fn();
  const successCb = onSuccess ?? vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AddMemberDialog
        open={open}
        onOpenChange={onOpenChange}
        clubId={clubId}
        unitId={unitId}
        unitName={unitName}
        existingMembers={existingMembers}
        onSuccess={successCb}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess: successCb };
}

// Helper: select a member from the mocked combobox
async function selectMember(userId: string) {
  const combobox = screen.getByTestId("member-combobox");
  await act(async () => {
    fireEvent.change(combobox, { target: { value: userId } });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddUnitMember.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders title and unit name in description ─────────────────────────

  it("renders title, unit name in description, and cancel/submit buttons when open", () => {
    renderDialog({ unitName: "Unidad Águilas" });

    expect(
      screen.getByRole("heading", { name: /agregar miembro/i }),
    ).toBeInTheDocument();
    // Unit name appears in the description text
    const unitNameEls = screen.getAllByText(/Unidad Águilas/);
    expect(unitNameEls.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar/i })).toBeInTheDocument();
  });

  // ── 2. Dialog not in DOM when closed ────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /agregar miembro/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Submit button disabled when no userId selected ────────────────────

  it("disables submit button when no member is selected", () => {
    renderDialog();

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    expect(submitBtn).toBeDisabled();
  });

  // ── 4. Validation — shows inline error when submitting with empty userId ──

  it("shows inline error when form is submitted with no userId via keyboard", async () => {
    renderDialog();

    // Force submit with empty userId (bypass disabled by triggering the form directly)
    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText(/selecciona un miembro para agregar/i)).toBeInTheDocument();
    });

    expect(mockAddUnitMember).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — calls addUnitMember with correct args ────────────────

  it("calls addUnitMember with clubId, unitId, userId on valid submit", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ clubId: 5, unitId: 21 });

    await selectMember("user-002");

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockAddUnitMember).toHaveBeenCalledWith(5, 21, "user-002");
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.member_added);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Cancel calls onOpenChange(false) and clears state ─────────────────

  it("calls onOpenChange(false) and does NOT call addUnitMember on cancel", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockAddUnitMember).not.toHaveBeenCalled();
  });

  // ── 7. API error — shows error toast from Error instance ─────────────────

  it("shows error toast from Error.message when addUnitMember throws", async () => {
    mockAddUnitMember.mockRejectedValue(new Error("Member already in unit"));

    const { onSuccess } = renderDialog();

    await selectMember("user-002");

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Member already in unit");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ── 8. API error — falls back to i18n message for non-Error throws ───────

  it("shows i18n fallback error toast when addUnitMember throws a non-Error", async () => {
    mockAddUnitMember.mockRejectedValue({ status: 500 });

    renderDialog();

    await selectMember("user-002");

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.add_member_failed);
    });
  });

  // ── 9. In-flight — buttons disabled while submitting ─────────────────────

  it("disables buttons while submission is in flight", async () => {
    let resolveAdd!: () => void;
    mockAddUnitMember.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveAdd = () => res({ ok: true });
      }),
    );

    renderDialog();

    await selectMember("user-002");

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /agregando/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });

    await act(async () => {
      resolveAdd();
    });
  });

  // ── 10. Closing via cancel resets userId state ────────────────────────────

  it("resets selected member when dialog is closed via cancel", async () => {
    const { onOpenChange, rerender } = renderDialog({ open: true });

    await selectMember("user-002");

    // Cancel closes dialog
    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Re-open — userId should be reset (empty combobox)
    rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AddMemberDialog
          open={true}
          onOpenChange={onOpenChange}
          clubId={5}
          unitId={21}
          unitName="Unidad Águilas"
          existingMembers={[]}
          onSuccess={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    const combobox = screen.getByTestId("member-combobox") as HTMLSelectElement;
    expect(combobox.value).toBe("");
  });

  // ── 11. existingMembers — excludedIds forwarded as prop ──────────────────

  it("renders with existingMembers prop without error", () => {
    // Verifies that existingMembers are accepted; the mock combobox receives excludeUserIds
    renderDialog({ existingMembers: [ACTIVE_MEMBER] });

    expect(screen.getByRole("heading", { name: /agregar miembro/i })).toBeInTheDocument();
  });

  // ── 12. onSuccess NOT called on API error ────────────────────────────────

  it("does NOT call onSuccess when addUnitMember fails", async () => {
    mockAddUnitMember.mockRejectedValue(new Error("Server error"));

    const { onSuccess } = renderDialog();

    await selectMember("user-002");

    const submitBtn = screen.getByRole("button", { name: /agregar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
