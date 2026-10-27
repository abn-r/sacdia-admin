/**
 * PendingMembersTable in verify-only mode (coordinators and any reviewer with
 * consent:verify but not club_members:approve): the row keeps the consent
 * badge and the verify action, but approve / reject are not rendered at all.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
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
const mockVerify = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listMembershipRequestsFromClient: (...args: unknown[]) => mockList(...args),
    approveMembershipRequest: (...args: unknown[]) => mockApprove(...args),
    verifyConsent: (...args: unknown[]) => mockVerify(...args),
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { PendingMembersTable } from "@/components/membership/pending-members-table";

const consentMsg = messages.membership.consent;
const tableMsg = messages.membership.table;

function pendingMinor(): MembershipRequest {
  return {
    assignment_id: "asg-minor",
    club_section_id: 42,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    users: { user_id: "u-m", name: "Ana", paternal_last_name: "Pérez", email: null },
    roles: { role_id: "r", role_name: "member" },
    consent: {
      required: true,
      dependent: true,
      guardianship_id: "g-1",
      status: "pending",
      evidence_uploaded: true,
      guardians: [{ display_name: "María Pérez", relationship_type_name: "Madre", is_primary: true }],
      viewer_can_verify: true,
      viewer_verify_block: null,
    },
  };
}

function renderTable(
  requests: MembershipRequest[],
  mode?: "approve" | "verify-only",
) {
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

describe("PendingMembersTable verify-only mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockApprove.mockResolvedValue({});
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

  it("hides approve and reject, keeps the badge and the verify action", () => {
    renderTable([pendingMinor()], "verify-only");

    expect(screen.queryByRole("button", { name: tableMsg.aria_approve })).toBeNull();
    expect(screen.queryByRole("button", { name: tableMsg.aria_reject })).toBeNull();
    expect(screen.getByText(consentMsg.badge_pending)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: consentMsg.verify_action_aria }),
    ).toBeEnabled();
  });

  it("default mode keeps approve and reject (regression)", () => {
    renderTable([pendingMinor()]);

    expect(screen.getByRole("button", { name: tableMsg.aria_approve })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: tableMsg.aria_reject })).toBeInTheDocument();
  });

  it("the verify dialog opens without the approve option and sends approve:false", async () => {
    const user = userEvent.setup();
    renderTable([pendingMinor()], "verify-only");

    await user.click(screen.getByRole("button", { name: consentMsg.verify_action_aria }));
    await screen.findByRole("img", { name: consentMsg.dialog.evidence_image_alt });

    expect(screen.queryByLabelText(consentMsg.dialog.approve_checkbox)).toBeNull();
    await user.click(screen.getByLabelText(consentMsg.dialog.confirm_checkbox));
    await user.click(screen.getByRole("button", { name: consentMsg.dialog.confirm }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
    expect(mockVerify).toHaveBeenCalledWith(42, "asg-minor", {
      confirm_paper_form_reviewed: true,
      approve: false,
    });
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("verifying marks the coordinator consent queue stale so it refetches when reopened", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTable([pendingMinor()], "verify-only");
    queryClient.setQueryData(["membership", "consent-queue", 0], { items: [], total: 0 });

    await user.click(screen.getByRole("button", { name: consentMsg.verify_action_aria }));
    await screen.findByRole("img", { name: consentMsg.dialog.evidence_image_alt });
    await user.click(screen.getByLabelText(consentMsg.dialog.confirm_checkbox));
    await user.click(screen.getByRole("button", { name: consentMsg.dialog.confirm }));

    await waitFor(() =>
      expect(
        queryClient.getQueryState(["membership", "consent-queue", 0])?.isInvalidated,
      ).toBe(true),
    );
  });

  it("uses verification copy for the empty state and the count", () => {
    renderTable([], "verify-only");

    expect(screen.getByText(tableMsg.empty_title_verify_only)).toBeInTheDocument();
    expect(screen.getByText(tableMsg.empty_description_verify_only)).toBeInTheDocument();
  });

  it("counts forms, not requests", () => {
    renderTable([pendingMinor()], "verify-only");

    expect(
      screen.getByText(tableMsg.count_verify_only_one.replace("{count}", "1")),
    ).toBeInTheDocument();
  });
});
