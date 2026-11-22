/**
 * PostRegistrationTab: onboarding mode (step 3 "No aplica", panel_only notice
 * and badge) and the "Acceso a la cuenta" card that resends the invitation
 * (shown only while pending AND with the user-creation permission; toasts for
 * 409 / 429 / 503).
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { PostRegistrationStatus } from "@/lib/api/post-registration";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockResend = vi.fn<(...args: any[]) => Promise<void>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/admin-users", () => ({
  resendAdminUserInvitationFromClient: (...args: unknown[]) => mockResend(...args),
}));

vi.mock("@/lib/post-registration/actions", () => ({
  completeStep1Action: vi.fn(),
  completeStep2Action: vi.fn(),
  completeStep3Action: vi.fn(),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

import { PostRegistrationTab } from "@/components/users/post-registration-tab";
import { ApiError } from "@/lib/api/client";

const p = messages.users.postRegistration;

function status(overrides: Partial<PostRegistrationStatus> = {}): PostRegistrationStatus {
  return {
    complete: false,
    steps: { profilePicture: false, personalInfo: false, clubSelection: false },
    nextStep: "profilePicture",
    dateCompleted: null,
    ...overrides,
  };
}

function renderTab(
  props: Partial<React.ComponentProps<typeof PostRegistrationTab>> = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PostRegistrationTab
        userId="user-1"
        status={status()}
        photoStatus={{ has_photo: false }}
        canOverride
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("PostRegistrationTab onboarding mode", () => {
  beforeEach(() => {
    mockResend.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockRefresh.mockReset();
  });
  afterEach(cleanup);

  it("treats a missing onboarding_mode as club: step 3 applies and can show its note", () => {
    renderTab();
    expect(screen.queryByText(p.step_status_not_applicable)).toBeNull();
    expect(screen.getByText(p.step3_note)).toBeTruthy();
    // Steps 1 and 2 are overridable, step 3 never is.
    expect(screen.getAllByRole("button", { name: p.force_complete_button })).toHaveLength(2);
  });

  it("club_exempt: step 3 reads No aplica, has no note and no override; steps 1-2 stay overridable", () => {
    renderTab({ status: status({ onboarding_mode: "club_exempt" }) });

    expect(screen.getAllByText(p.step_status_not_applicable)).toHaveLength(1);
    expect(screen.getByText(p.step3_not_applicable_description)).toBeTruthy();
    expect(screen.queryByText(p.step3_note)).toBeNull();
    expect(screen.queryByText(p.step3_req1)).toBeNull();
    expect(screen.getAllByRole("button", { name: p.force_complete_button })).toHaveLength(2);
    // The overall badge keeps reporting the real state (same copy as the
    // pending badge of the next step, hence two matches).
    expect(screen.getAllByText(p.badge_pending)).toHaveLength(2);
    expect(screen.queryByText(p.panel_only_notice)).toBeNull();
  });

  it("club_exempt after self-completion: overall badge is complete", () => {
    renderTab({
      status: status({
        onboarding_mode: "club_exempt",
        complete: true,
        steps: { profilePicture: true, personalInfo: true, clubSelection: false },
        nextStep: null,
      }),
    });
    expect(screen.getByText(p.badge_complete)).toBeTruthy();
    expect(screen.getAllByText(p.step_status_not_applicable)).toHaveLength(1);
  });

  it("panel_only: shows the notice and No aplica as the overall badge and on step 3", () => {
    renderTab({ status: status({ onboarding_mode: "panel_only", nextStep: null }) });

    expect(screen.getByText(p.panel_only_notice)).toBeTruthy();
    // overall badge + step 3
    expect(screen.getAllByText(p.step_status_not_applicable)).toHaveLength(2);
    expect(screen.queryByText(p.badge_pending)).toBeNull();
    expect(screen.queryByText(p.step3_note)).toBeNull();
  });

  it("unknown mode value falls back to club", () => {
    renderTab({
      status: status({ onboarding_mode: "something_else" as never }),
    });
    expect(screen.queryByText(p.step_status_not_applicable)).toBeNull();
  });
});

describe("PostRegistrationTab resend invitation card", () => {
  beforeEach(() => {
    mockResend.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockRefresh.mockReset();
  });
  afterEach(cleanup);

  it("is hidden by default (invitation_pending missing)", () => {
    renderTab({ canResendInvitation: true });
    expect(screen.queryByText(p.account_access_title)).toBeNull();
  });

  it("is hidden when pending but the actor cannot create users", () => {
    renderTab({ invitationPending: true, canResendInvitation: false });
    expect(screen.queryByText(p.account_access_title)).toBeNull();
  });

  it("is hidden when the invitation was accepted", () => {
    renderTab({ invitationPending: false, canResendInvitation: true });
    expect(screen.queryByRole("button", { name: p.resend_invitation })).toBeNull();
  });

  it("resends and confirms with a success toast", async () => {
    mockResend.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderTab({ invitationPending: true, canResendInvitation: true });

    expect(screen.getByText(p.account_access_title)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: p.resend_invitation }));

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("user-1"));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(p.resend_invitation_success));
  });

  it.each([
    [409, "resend_invitation_already_accepted"],
    [429, "resend_invitation_rate_limited"],
    [503, "resend_invitation_unavailable"],
    [500, "resend_invitation_failed"],
  ] as const)("maps %s to its toast", async (statusCode, key) => {
    mockResend.mockRejectedValueOnce(new ApiError("x", statusCode, {}));
    const user = userEvent.setup();
    renderTab({ invitationPending: true, canResendInvitation: true });

    await user.click(screen.getByRole("button", { name: p.resend_invitation }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(p[key]));
    // Only an already-accepted invitation reloads the page (the card goes away).
    expect(mockRefresh).toHaveBeenCalledTimes(statusCode === 409 ? 1 : 0);
  });
});
