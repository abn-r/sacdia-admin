/**
 * PendingMembersTable: one row per request, a single action that opens a side
 * sheet. Rejecting happens inside the sheet; a minor with a pending guardian
 * form has no "Aprobar" anywhere until the form is verified.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { testMessages as messages } from "@/components/requests/test-intl";
import type { MembershipRequest } from "@/lib/api/membership-requests";
import { TooltipProvider } from "@/components/ui/tooltip";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<MembershipRequest[]>>();
const mockApprove = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockReject = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockVerify = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/requests/membership",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listMembershipRequestsFromClient: (...args: unknown[]) => mockList(...args),
    approveMembershipRequest: (...args: unknown[]) => mockApprove(...args),
    rejectMembershipRequest: (...args: unknown[]) => mockReject(...args),
    verifyConsent: (...args: unknown[]) => mockVerify(...args),
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
    warning: vi.fn(),
  },
}));

import { PendingMembersTable } from "@/components/membership/pending-members-table";
import { ApiError } from "@/lib/api/client";

const tq = messages.queues.requests.membership;
const consentMsg = messages.membership.consent;
const sheetMsg = messages.queues.requests.sheet;

function adult(): MembershipRequest {
  return {
    assignment_id: "asg-adult",
    club_section_id: 42,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    users: { user_id: "u-a", name: "Luis", paternal_last_name: "Gómez", email: "luis@example.com" },
    roles: { role_id: "r", role_name: "member" },
    consent: null,
  };
}

function minor(
  status: "pending" | "verified",
  extra: Partial<NonNullable<MembershipRequest["consent"]>> = {},
): MembershipRequest {
  return {
    assignment_id: `asg-minor-${status}`,
    club_section_id: 42,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    users: { user_id: "u-m", name: "Regina", paternal_last_name: "Salas", email: null },
    roles: { role_id: "r", role_name: "member" },
    consent: {
      required: true,
      dependent: true,
      guardianship_id: "g-1",
      status,
      evidence_uploaded: true,
      guardians: [{ display_name: "Laura Salas", relationship_type_name: "Madre", is_primary: true }],
      ...extra,
    },
  };
}

function renderTable(requests: MembershipRequest[], mode?: "approve" | "verify-only") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TooltipProvider>
          <PendingMembersTable
            clubSectionId={42}
            initialRequests={requests}
            {...(mode ? { mode } : {})}
          />
        </TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe("PendingMembersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockApprove.mockResolvedValue({});
    mockReject.mockResolvedValue({});
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g-1", consent_status: "verified" },
      assignment: null,
      approve_error: null,
    });
    mockGetEvidence.mockResolvedValue({
      url: "https://r2.example/signed",
      expires_in: 900,
      content_type: "image/jpeg",
      uploaded_at: "2026-10-02T12:00:00.000Z",
    });
  });

  afterEach(() => cleanup());

  it("marks only the exception: an adult has no mark and only a Revisar action", () => {
    renderTable([adult()]);
    expect(screen.queryByText(tq.consentPending)).toBeNull();
    expect(screen.getByRole("button", { name: /Revisar: Luis Gómez/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Aprobar/ })).toBeNull();
  });

  it("approves from inside the sheet and re-syncs the list", async () => {
    const user = userEvent.setup();
    renderTable([adult()]);

    await user.click(screen.getByRole("button", { name: /Revisar: Luis Gómez/ }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: tq.sheet.approve }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(42, "asg-adult"));
    expect(mockToastSuccess).toHaveBeenCalled();
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(42));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("rejects inside the same sheet: the footer asks for a reason and says who reads it", async () => {
    const user = userEvent.setup();
    renderTable([adult()]);

    await user.click(screen.getByRole("button", { name: /Revisar: Luis Gómez/ }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: tq.sheet.rejectAction }));

    expect(within(sheet).getByText(new RegExp(tq.sheet.rejectAudience))).toBeInTheDocument();
    // Still one dialog: no second layer on top.
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    await user.type(within(sheet).getByLabelText(new RegExp(sheetMsg.reasonLabel)), "abc");
    await user.click(within(sheet).getByRole("button", { name: tq.sheet.rejectConfirm }));
    expect(mockReject).not.toHaveBeenCalled();

    await user.type(within(sheet).getByLabelText(new RegExp(sheetMsg.reasonLabel)), "defgh");
    await user.click(within(sheet).getByRole("button", { name: tq.sheet.rejectConfirm }));
    await waitFor(() => expect(mockReject).toHaveBeenCalledWith(42, "asg-adult", "abcdefgh"));
  });

  it("pending guardian form: marked, no Aprobar, and Verificar ficha opens the wide sheet with the form", async () => {
    const user = userEvent.setup();
    renderTable([minor("pending")]);

    expect(screen.getByText(tq.consentPending)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprobar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Revisar/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Verificar ficha: Regina Salas/ }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Laura Salas")).toBeInTheDocument();
    await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledWith(42, "asg-minor-pending"));
    // The two checkboxes say what confirming does.
    expect(within(sheet).getByText(tq.verify.reviewedHint)).toBeInTheDocument();
    expect(within(sheet).getByText(tq.verify.approveHint)).toBeInTheDocument();
  });

  it("a verified form has no mark and can be reviewed and approved", () => {
    renderTable([minor("verified")]);
    expect(screen.queryByText(tq.consentPending)).toBeNull();
    expect(screen.getByRole("button", { name: /Revisar: Regina Salas/ })).toBeEnabled();
  });

  it("disables verify with the reason when the viewer registered or guards the minor", async () => {
    const user = userEvent.setup();
    renderTable([minor("pending", { viewer_verify_block: "self_custodian" })]);

    const verify = screen.getByRole("button", { name: /Verificar ficha: Regina Salas/ });
    expect(verify).toBeDisabled();
    await user.hover(verify.parentElement as HTMLElement);
    expect(
      (await screen.findAllByText(messages.membership.consent.errors.GUARDIANSHIP_CUSTODIAN_SELF_VERIFY)).length,
    ).toBeGreaterThan(0);
  });

  it("disables verify when nobody is linked yet, with its tooltip", async () => {
    const user = userEvent.setup();
    renderTable([minor("pending", { guardianship_id: null, guardians: [] })]);

    const verify = screen.getByRole("button", { name: /Verificar ficha: Regina Salas/ });
    expect(verify).toBeDisabled();
    await user.hover(verify.parentElement as HTMLElement);
    expect((await screen.findAllByText(consentMsg.verify_no_guardian)).length).toBeGreaterThan(0);
  });

  it("MR_CONSENT_NOT_VERIFIED on approve: explains inline and re-syncs", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(
      new ApiError("Consent not verified", 409, { code: "MR_CONSENT_NOT_VERIFIED" }),
    );
    mockList.mockResolvedValue([adult()]);
    renderTable([adult()]);

    await user.click(screen.getByRole("button", { name: /Revisar: Luis Gómez/ }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: tq.sheet.approve }));

    expect(
      await within(sheet).findByText(messages.membership.consent.errors.MR_CONSENT_NOT_VERIFIED),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(42));
  });

  it("shows the effective expiry and falls back to the base one", () => {
    const BASE = "2026-10-09T12:00:00.000Z";
    const EFFECTIVE = "2026-10-31T12:00:00.000Z";
    renderTable([
      { ...minor("pending"), expires_at: BASE, effective_expires_at: EFFECTIVE },
      { ...adult(), assignment_id: "a2", expires_at: BASE, effective_expires_at: null },
    ]);
    expect(screen.getByText(/\b31 oct/)).toBeInTheDocument();
    expect(screen.getAllByText(/\b09 oct/)).toHaveLength(1);
    expect(screen.getByRole("img", { name: consentMsg.expiry_extended_hint })).toBeInTheDocument();
  });

  it("flags 'expiring soon' from the effective date, not the base one", () => {
    const soon = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
    const far = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
    const { container } = renderTable([
      { ...minor("pending"), expires_at: soon, effective_expires_at: far },
    ]);
    expect(container.querySelector("span.text-warning")).toBeNull();
  });

  it("shows the empty state of the section", () => {
    renderTable([]);
    expect(screen.getByText(messages.membership.table.empty_title)).toBeInTheDocument();
  });

  describe("verify-only (coordinator)", () => {
    it("offers only Verificar ficha on pending forms; no approve, review or reject", async () => {
      const user = userEvent.setup();
      renderTable([minor("pending", { viewer_verify_block: null })], "verify-only");

      expect(screen.queryByRole("button", { name: /Aprobar|Revisar/ })).toBeNull();
      await user.click(screen.getByRole("button", { name: /Verificar ficha: Regina Salas/ }));
      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).queryByLabelText(consentMsg.dialog.approve_checkbox)).toBeNull();
      expect(within(sheet).queryByRole("button", { name: tq.verify.rejectAction })).toBeNull();
      expect(within(sheet).queryByRole("button", { name: consentMsg.dialog.upload })).toBeNull();
    });

    it("verifying sends approve:false and marks the coordinator queue stale", async () => {
      const user = userEvent.setup();
      const { queryClient } = renderTable([minor("pending")], "verify-only");
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      await user.click(screen.getByRole("button", { name: /Verificar ficha: Regina Salas/ }));
      const sheet = await screen.findByRole("dialog");
      await within(sheet).findByAltText(consentMsg.dialog.evidence_image_alt);
      await user.click(within(sheet).getByLabelText(consentMsg.dialog.confirm_checkbox));
      await user.click(within(sheet).getByRole("button", { name: consentMsg.dialog.confirm }));

      await waitFor(() =>
        expect(mockVerify).toHaveBeenCalledWith(42, "asg-minor-pending", {
          confirm_paper_form_reviewed: true,
          approve: false,
        }),
      );
      await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });
  });
});
