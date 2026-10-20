/**
 * MembershipRequestsClientPage: section picker + lazy per-section list.
 * In verify-only mode the list is rendered without approve / reject, and a
 * 403 GUARD_CLUB_SCOPE_REQUIRED explains the section is out of scope (by code).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
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
// Radix Select needs these in jsdom.
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<MembershipRequest[]>>();
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listMembershipRequestsFromClient: (...args: unknown[]) => mockList(...args),
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
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

function renderPage(
  mode?: "approve" | "verify-only",
  pageSections: Array<{
    club_section_id: number;
    label: string;
    mode?: "approve" | "verify-only";
  }> = sections,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TooltipProvider>
          <MembershipRequestsClientPage
            sections={pageSections}
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
    mockGetEvidence.mockResolvedValue({
      url: "https://r2.example/signed",
      expires_in: 900,
      content_type: "image/jpeg",
      uploaded_at: "2026-10-02T12:00:00.000Z",
    });
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

  it("switching section loads that section's list lazily and keeps verify-only", async () => {
    const user = userEvent.setup();
    renderPage("verify-only");
    await screen.findByText(consentMsg.badge_pending);

    mockList.mockResolvedValueOnce([]);
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: sections[1].label }));

    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(9));
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(tableMsg.empty_title_verify_only)).toBeInTheDocument();
  });

  it("opens the consent dialog from a covered section, without the approve option", async () => {
    const user = userEvent.setup();
    renderPage("verify-only");

    await user.click(await screen.findByRole("button", { name: consentMsg.verify_action_aria }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(consentMsg.dialog.title)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(consentMsg.dialog.approve_checkbox)).toBeNull();
    await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledWith(7, "asg-minor"));
  });

  describe("per-section review mode (coordinator who also approves in a club)", () => {
    const mixed = [
      { club_section_id: 7, label: "Club Águilas · Conquistadores", mode: "verify-only" as const },
      { club_section_id: 9, label: "Club Halcones · Aventureros", mode: "approve" as const },
    ];

    it("a coordinator-only section shows verify-only UI even on an approve page", async () => {
      renderPage("approve", mixed);

      const verify = await screen.findByRole("button", { name: consentMsg.verify_action_aria });
      expect(verify).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: tableMsg.aria_approve })).toBeNull();
      expect(screen.queryByRole("button", { name: tableMsg.aria_reject })).toBeNull();

      const user = userEvent.setup();
      await user.click(verify);
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).queryByLabelText(consentMsg.dialog.approve_checkbox)).toBeNull();
    });

    it("an own-club section shows the approve UI", async () => {
      const user = userEvent.setup();
      renderPage("approve", mixed);
      await screen.findByRole("button", { name: consentMsg.verify_action_aria });

      await user.click(screen.getByRole("combobox"));
      await user.click(await screen.findByRole("option", { name: mixed[1].label }));

      expect(
        await screen.findByRole("button", { name: tableMsg.aria_approve }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: tableMsg.aria_reject })).toBeInTheDocument();
    });

    it("switching back from an own-club section to a coordinator one drops approve again", async () => {
      const user = userEvent.setup();
      renderPage("approve", [mixed[1], mixed[0]]);
      await screen.findByRole("button", { name: tableMsg.aria_approve });

      await user.click(screen.getByRole("combobox"));
      await user.click(await screen.findByRole("option", { name: mixed[0].label }));

      await waitFor(() =>
        expect(screen.queryByRole("button", { name: tableMsg.aria_approve })).toBeNull(),
      );
      expect(
        await screen.findByRole("button", { name: consentMsg.verify_action_aria }),
      ).toBeInTheDocument();
    });
  });
});
