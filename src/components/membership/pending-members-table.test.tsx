/**
 * Tests for the consent additions of PendingMembersTable: badge for minors,
 * approve disabled (with tooltip) while consent is pending, verify action
 * opening the dialog, null email shown as an em dash, and error-code mapping
 * when approve is rejected with MR_CONSENT_NOT_VERIFIED.
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
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listMembershipRequestsFromClient: (...args: unknown[]) => mockList(...args),
    approveMembershipRequest: (...args: unknown[]) => mockApprove(...args),
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

const consentMsg = messages.membership.consent;

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

function minor(status: "pending" | "verified"): MembershipRequest {
  return {
    assignment_id: `asg-minor-${status}`,
    club_section_id: 42,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    users: { user_id: "u-m", name: "Ana", paternal_last_name: "Pérez", email: null },
    roles: { role_id: "r", role_name: "member" },
    consent: {
      required: true,
      dependent: true,
      guardianship_id: "g-1",
      status,
      evidence_uploaded: true,
      guardians: [{ display_name: "María Pérez", relationship_type_name: "Madre", is_primary: true }],
    },
  };
}

function renderTable(requests: MembershipRequest[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TooltipProvider>
          <PendingMembersTable clubSectionId={42} initialRequests={requests} />
        </TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const approveBtn = () =>
  screen.getAllByRole("button", { name: messages.membership.table.aria_approve });

describe("PendingMembersTable (consent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockApprove.mockResolvedValue({});
    mockGetEvidence.mockResolvedValue({
      url: "https://r2.example/signed",
      expires_in: 900,
      content_type: "image/jpeg",
      uploaded_at: "2026-10-02T12:00:00.000Z",
    });
  });

  afterEach(() => cleanup());

  it("shows no badge or verify action for adults, and approve is enabled", () => {
    renderTable([adult()]);

    expect(screen.queryByText(consentMsg.badge_pending)).toBeNull();
    expect(screen.queryByText(consentMsg.badge_verified)).toBeNull();
    expect(screen.queryByRole("button", { name: consentMsg.verify_action_aria })).toBeNull();
    expect(approveBtn()[0]).toBeEnabled();
  });

  it("pending minor: badge, approve disabled, verify action present, email dash", () => {
    renderTable([minor("pending")]);

    expect(screen.getByText(consentMsg.badge_pending)).toBeInTheDocument();
    expect(approveBtn()[0]).toBeDisabled();
    expect(
      screen.getByRole("button", { name: consentMsg.verify_action_aria }),
    ).toBeEnabled();
    // null email renders as an em dash under the name
    expect(screen.getByText("—", { selector: "p" })).toBeInTheDocument();
  });

  it("explains why approve is blocked via tooltip", async () => {
    const user = userEvent.setup();
    renderTable([minor("pending")]);

    await user.hover(approveBtn()[0].parentElement as HTMLElement);
    expect(
      (await screen.findAllByText(consentMsg.approve_blocked)).length,
    ).toBeGreaterThan(0);
  });

  it("verified minor: verified badge, approve enabled, no verify action", async () => {
    const user = userEvent.setup();
    renderTable([minor("verified")]);

    expect(screen.getByText(consentMsg.badge_verified)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: consentMsg.verify_action_aria })).toBeNull();
    expect(approveBtn()[0]).toBeEnabled();

    await user.click(approveBtn()[0]);
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(42, "asg-minor-verified"));
  });

  it("opens the verify dialog from the verify action", async () => {
    const user = userEvent.setup();
    renderTable([minor("pending")]);

    await user.click(screen.getByRole("button", { name: consentMsg.verify_action_aria }));

    expect(
      await screen.findByRole("alertdialog", { name: consentMsg.dialog.title }),
    ).toBeInTheDocument();
    expect(mockGetEvidence).toHaveBeenCalledWith(42, "asg-minor-pending");
  });

  it("maps MR_CONSENT_NOT_VERIFIED on approve to the translated message and re-syncs the list", async () => {
    mockApprove.mockRejectedValue(
      new ApiError("server msg", 409, { code: "MR_CONSENT_NOT_VERIFIED" }),
    );
    mockList.mockResolvedValue([minor("pending")]);
    const user = userEvent.setup();
    renderTable([minor("verified")]);

    await user.click(approveBtn()[0]);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(consentMsg.errors.MR_CONSENT_NOT_VERIFIED),
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(42));
  });
});

describe("PendingMembersTable (effective expiry)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  afterEach(() => cleanup());

  // Noon UTC keeps the calendar day stable across time zones.
  const BASE = "2026-10-09T12:00:00.000Z";
  const EFFECTIVE = "2026-10-31T12:00:00.000Z";

  it("shows effective_expires_at instead of the base expires_at", () => {
    renderTable([
      { ...minor("pending"), expires_at: BASE, effective_expires_at: EFFECTIVE },
    ]);

    expect(screen.getByText(/\b31 oct/)).toBeInTheDocument();
    expect(screen.queryByText(/\b09 oct/)).toBeNull();
  });

  it("falls back to expires_at when effective_expires_at is absent or null", () => {
    renderTable([
      { ...adult(), assignment_id: "a1", expires_at: BASE },
      { ...adult(), assignment_id: "a2", expires_at: BASE, effective_expires_at: null },
    ]);

    expect(screen.getAllByText(/\b09 oct/)).toHaveLength(2);
  });

  it("pending-consent minors get the 'extended while pending' hint", async () => {
    const user = userEvent.setup();
    renderTable([
      { ...minor("pending"), expires_at: BASE, effective_expires_at: EFFECTIVE },
    ]);

    const hint = screen.getByRole("img", { name: consentMsg.expiry_extended_hint });
    expect(hint).toBeInTheDocument();
    await user.hover(hint);
    expect((await screen.findAllByText(consentMsg.expiry_extended_hint)).length).toBeGreaterThan(0);
  });

  it("adults and verified minors get no extended hint", () => {
    renderTable([
      { ...adult(), expires_at: BASE },
      { ...minor("verified"), expires_at: BASE },
    ]);

    expect(screen.queryByRole("img", { name: consentMsg.expiry_extended_hint })).toBeNull();
  });

  it("flags 'expiring soon' from the effective date, not the base one", () => {
    const soon = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
    const far = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
    const { container } = renderTable([
      { ...minor("pending"), expires_at: soon, effective_expires_at: far },
    ]);
    // Base is within 48h but the effective date is 20 days out: no warning styling.
    expect(container.querySelector(".text-warning")).toBeNull();

    cleanup();
    const { container: c2 } = renderTable([
      { ...minor("pending"), expires_at: far, effective_expires_at: soon },
    ]);
    expect(c2.querySelector(".text-warning")).not.toBeNull();
  });
});
