/**
 * MembershipRequestsClientPage: section picker + lazy per-section list.
 * In verify-only mode the list is rendered without approve / reject, and a
 * 403 GUARD_CLUB_SCOPE_REQUIRED explains the section is out of scope (by code).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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
// Radix Select needs these in jsdom.
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<MembershipRequest[]>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listMembershipRequestsFromClient: (...args: unknown[]) => mockList(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { MembershipRequestsClientPage } from "@/components/membership/membership-requests-client-page";
import { ApiError } from "@/lib/api/client";

const clientMsg = messages.membership.client;
const tableMsg = messages.membership.table;
const consentMsg = messages.membership.consent;

const sections = [
  { club_section_id: 7, label: "Club Águilas · Conquistadores" },
  { club_section_id: 9, label: "Club Halcones · Aventureros" },
];

function pendingMinor(): MembershipRequest {
  return {
    assignment_id: "asg-minor",
    club_section_id: 7,
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
      guardians: [],
    },
  };
}

function renderPage(mode?: "approve" | "verify-only") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TooltipProvider>
          <MembershipRequestsClientPage
            sections={sections}
            {...(mode ? { mode } : {})}
          />
        </TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("MembershipRequestsClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([pendingMinor()]);
  });

  afterEach(() => cleanup());

  it("loads only the first section on mount (lazy per section)", async () => {
    renderPage("verify-only");

    await screen.findByText(consentMsg.badge_pending);
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(7);
  });

  it("verify-only: the loaded list has the verify action and no approve / reject", async () => {
    renderPage("verify-only");

    await screen.findByRole("button", { name: consentMsg.verify_action_aria });
    expect(screen.queryByRole("button", { name: tableMsg.aria_approve })).toBeNull();
    expect(screen.queryByRole("button", { name: tableMsg.aria_reject })).toBeNull();
  });

  it("default mode keeps approve and reject (regression)", async () => {
    renderPage();

    await screen.findByRole("button", { name: tableMsg.aria_approve });
    expect(screen.getByRole("button", { name: tableMsg.aria_reject })).toBeInTheDocument();
  });

  it("403 GUARD_CLUB_SCOPE_REQUIRED: shows the out-of-scope message, not the table", async () => {
    mockList.mockRejectedValue(
      new ApiError("Forbidden resource", 403, { code: "GUARD_CLUB_SCOPE_REQUIRED" }),
    );
    renderPage("verify-only");

    expect(await screen.findByText(clientMsg.load_error_scope)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: consentMsg.verify_action_aria })).toBeNull();
  });

  it("any other 403 keeps the generic permission message", async () => {
    mockList.mockRejectedValue(
      new ApiError("Forbidden resource", 403, { code: "GUARD_PERMISSION_DENIED" }),
    );
    renderPage("verify-only");

    await waitFor(() =>
      expect(screen.getByText(clientMsg.load_error_permission)).toBeInTheDocument(),
    );
  });
});
